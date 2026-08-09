const prisma = require('../lib/prisma');
const { WEEKDAY_CODES, resolveOccurrenceForToday } = require('../lib/recurrence');
const { requireWorkspaceAccess } = require('../lib/workspaceAccess');

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const VALID_TASK_TYPES = ['STANDARD', 'OWNER_ASSIGNED'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function resolveWorkspaceId(req) {
  return req.query.workspaceId || req.body?.workspaceId;
}

/**
 * GET /api/tasks
 * Returns all tasks grouped implicitly by status, ordered by `order` ascending.
 * The client groups them into columns based on `status`.
 */
async function getAllTasks(req, res) {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }

    const membership = await requireWorkspaceAccess(workspaceId, req.user.id);

    const sharedTasks = await prisma.task.findMany({
      where: { workspaceId, taskType: 'STANDARD' },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });

    if (membership.role === 'OWNER') {
      const assignedTasks = await prisma.task.findMany({
        where: { workspaceId, taskType: 'OWNER_ASSIGNED' },
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ assignee: { name: 'asc' } }, { status: 'asc' }, { order: 'asc' }],
      });

      const overviewMap = new Map();
      for (const task of assignedTasks) {
        if (!task.assignee) continue;

        if (!overviewMap.has(task.assigneeId)) {
          overviewMap.set(task.assigneeId, {
            userId: task.assignee.id,
            userName: task.assignee.name,
            userEmail: task.assignee.email,
            counts: { TODO: 0, IN_PROGRESS: 0, DONE: 0 },
            tasks: [],
          });
        }

        const group = overviewMap.get(task.assigneeId);
        group.counts[task.status] += 1;
        group.tasks.push(task);
      }

      return res.status(200).json({
        sharedTasks,
        assignedTasks: [],
        assignedOverview: Array.from(overviewMap.values()),
      });
    }

    const assignedTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        taskType: 'OWNER_ASSIGNED',
        assigneeId: req.user.id,
      },
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    });

    return res.status(200).json({
      sharedTasks,
      assignedTasks,
      assignedOverview: [],
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to fetch tasks.' });
  }
}

/**
 * POST /api/tasks
 * Creates a new task. New tasks are appended to the end of their column.
 */
async function createTask(req, res) {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }

    const membership = await requireWorkspaceAccess(workspaceId, req.user.id);

    const {
      title,
      description,
      status,
      dueDate,
      reminderEmail,
      isRecurring,
      recurringDays,
      recurringTime,
      taskType,
    } =
      req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ error: 'Invalid dueDate value.' });
    }

    if (reminderEmail && !EMAIL_REGEX.test(reminderEmail)) {
      return res.status(400).json({ error: 'Invalid reminderEmail value.' });
    }

    let normalizedDays = [];
    if (isRecurring) {
      if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
        return res.status(400).json({ error: 'Pick at least one day for a recurring task.' });
      }
      if (recurringDays.some((d) => !WEEKDAY_CODES.includes(d))) {
        return res.status(400).json({ error: 'Invalid recurringDays value.' });
      }
      normalizedDays = recurringDays;
    }

    if (recurringTime && !TIME_REGEX.test(recurringTime)) {
      return res.status(400).json({ error: 'Invalid recurringTime value. Use HH:mm.' });
    }

    const taskStatus = VALID_STATUSES.includes(status) ? status : 'TODO';
    const nextTaskType = VALID_TASK_TYPES.includes(taskType) ? taskType : 'STANDARD';

    const occurrence = isRecurring ? resolveOccurrenceForToday(normalizedDays, recurringTime) : null;

    if (nextTaskType === 'OWNER_ASSIGNED') {
      if (membership.role !== 'OWNER') {
        return res.status(403).json({ error: 'Only the workspace owner can create assigned tasks.' });
      }

      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, role: 'MEMBER' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (members.length === 0) {
        return res.status(400).json({ error: 'Add at least one member before creating an assigned task.' });
      }

      const createdTasks = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const member of members) {
          const lastTask = await tx.task.findFirst({
            where: {
              workspaceId,
              taskType: 'OWNER_ASSIGNED',
              assigneeId: member.userId,
              status: taskStatus,
            },
            orderBy: { order: 'desc' },
          });

          const nextOrder = lastTask ? lastTask.order + 1 : 0;
          const createdTask = await tx.task.create({
            data: {
              userId: req.user.id,
              assigneeId: member.userId,
              workspaceId,
              title: title.trim(),
              description: description ? description.trim() : null,
              taskType: 'OWNER_ASSIGNED',
              status: taskStatus,
              order: nextOrder,
              dueDate: occurrence ? occurrence.dueDate : dueDate ? new Date(dueDate) : null,
              reminderEmail: reminderEmail ? reminderEmail.trim() : null,
              isRecurring: Boolean(isRecurring),
              recurringDays: normalizedDays,
              recurringTime: isRecurring ? recurringTime || null : null,
              lastRecurredOn: occurrence ? occurrence.lastRecurredOn : null,
            },
          });

          results.push(createdTask);
        }

        return results;
      });

      return res.status(201).json(createdTasks);
    }

    const lastTask = await prisma.task.findFirst({
      where: { status: taskStatus, workspaceId, taskType: 'STANDARD' },
      orderBy: { order: 'desc' },
    });

    const nextOrder = lastTask ? lastTask.order + 1 : 0;

    const task = await prisma.task.create({
      data: {
        userId: req.user.id,
        workspaceId,
        title: title.trim(),
        description: description ? description.trim() : null,
        taskType: 'STANDARD',
        status: taskStatus,
        order: nextOrder,
        dueDate: occurrence ? occurrence.dueDate : dueDate ? new Date(dueDate) : null,
        reminderEmail: reminderEmail ? reminderEmail.trim() : null,
        isRecurring: Boolean(isRecurring),
        recurringDays: normalizedDays,
        recurringTime: isRecurring ? recurringTime || null : null,
        lastRecurredOn: occurrence ? occurrence.lastRecurredOn : null,
      },
    });

    return res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to create task.' });
  }
}

/**
 * PATCH /api/tasks/:id
 * Updates task fields (title, description, status). Used for manual edits,
 * e.g. from the edit modal. Does not handle reordering of other tasks.
 */
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }
    await requireWorkspaceAccess(workspaceId, req.user.id);

    const { title, description, status, order, dueDate, reminderEmail, isRecurring, recurringDays, recurringTime } =
      req.body;

    const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (existing.taskType === 'OWNER_ASSIGNED') {
      if (existing.assigneeId !== req.user.id) {
        return res.status(403).json({ error: 'Only the assigned member can update this task.' });
      }
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    if (dueDate && isNaN(new Date(dueDate).getTime())) {
      return res.status(400).json({ error: 'Invalid dueDate value.' });
    }

    if (reminderEmail && !EMAIL_REGEX.test(reminderEmail)) {
      return res.status(400).json({ error: 'Invalid reminderEmail value.' });
    }

    if (isRecurring && (!Array.isArray(recurringDays) || recurringDays.length === 0)) {
      return res.status(400).json({ error: 'Pick at least one day for a recurring task.' });
    }
    if (recurringDays && recurringDays.some((d) => !WEEKDAY_CODES.includes(d))) {
      return res.status(400).json({ error: 'Invalid recurringDays value.' });
    }
    if (recurringTime && !TIME_REGEX.test(recurringTime)) {
      return res.status(400).json({ error: 'Invalid recurringTime value. Use HH:mm.' });
    }

    const data = {};
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty.' });
      }
      data.title = title.trim();
    }
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (status !== undefined) data.status = status;
    if (order !== undefined) data.order = order;

    // Recurring settings are always sent together from the client, so treat
    // them as one unit: recompute today's occurrence whenever they change.
    if (isRecurring !== undefined) {
      data.isRecurring = Boolean(isRecurring);
      data.recurringDays = isRecurring ? recurringDays : [];
      data.recurringTime = isRecurring ? recurringTime || null : null;

      const occurrence = isRecurring
        ? resolveOccurrenceForToday(isRecurring ? recurringDays : [], recurringTime)
        : null;

      if (isRecurring) {
        data.dueDate = occurrence ? occurrence.dueDate : null;
        data.lastRecurredOn = occurrence ? occurrence.lastRecurredOn : null;
        data.reminder30Sent = false;
        data.reminder5Sent = false;
        data.reminderDueSent = false;
      } else {
        // Turning recurrence off falls back to a normal one-off dueDate if
        // the client sent one alongside the toggle.
        data.lastRecurredOn = null;
      }
    }

    if (dueDate !== undefined && isRecurring === undefined) {
      const nextDueDate = dueDate ? new Date(dueDate) : null;
      const dueDateChanged =
        (nextDueDate?.getTime() || null) !== (existing.dueDate?.getTime() || null);
      data.dueDate = nextDueDate;
      // Re-arm all reminders if the schedule changed, so a rescheduled task
      // gets fresh 30-min/5-min/due notifications instead of staying silent.
      if (dueDateChanged) {
        data.reminder30Sent = false;
        data.reminder5Sent = false;
        data.reminderDueSent = false;
      }
    }
    if (reminderEmail !== undefined) data.reminderEmail = reminderEmail ? reminderEmail.trim() : null;
    data.lastEditedById = req.user.id;
    data.lastEditedByName = req.user.name;
    data.lastEditedAt = new Date();

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return res.status(200).json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to update task.' });
  }
}

/**
 * PUT /api/tasks/reorder
 * Batch-updates task order/status after a drag-and-drop operation.
 * Expects: { tasks: [{ id, status, order }, ...] }
 * Only the tasks that actually moved need to be included, but sending the
 * full set of affected columns keeps ordering consistent.
 */
async function reorderTasks(req, res) {
  try {
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }
    await requireWorkspaceAccess(workspaceId, req.user.id);

    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks must be a non-empty array.' });
    }

    for (const t of tasks) {
      if (!t.id || t.order === undefined || !VALID_STATUSES.includes(t.status)) {
        return res.status(400).json({
          error: 'Each task must include id, a valid status, and order.',
        });
      }
    }

    const taskIds = tasks.map((task) => task.id);
    const ownedTasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, workspaceId },
      select: { id: true, taskType: true, assigneeId: true },
    });

    if (ownedTasks.length !== taskIds.length) {
      return res.status(403).json({ error: 'You can only reorder your own tasks.' });
    }

    const hasForbiddenAssignedTask = ownedTasks.some(
      (task) => task.taskType === 'OWNER_ASSIGNED' && task.assigneeId !== req.user.id
    );

    if (hasForbiddenAssignedTask) {
      return res.status(403).json({ error: 'Only the assigned member can move this task.' });
    }

    // Run all updates in a single transaction so the board state is never
    // left half-updated if one write fails.
    const updates = tasks.map((t) =>
      prisma.task.update({
        where: { id: t.id },
        data: {
          status: t.status,
          order: t.order,
          lastMovedById: req.user.id,
          lastMovedByName: req.user.name,
          lastMovedAt: new Date(),
        },
      })
    );

    const updatedTasks = await prisma.$transaction(updates);

    return res.status(200).json(updatedTasks);
  } catch (error) {
    console.error('Error reordering tasks:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to reorder tasks.' });
  }
}

/**
 * DELETE /api/tasks/:id
 */
async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    const workspaceId = resolveWorkspaceId(req);
    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required.' });
    }
    const membership = await requireWorkspaceAccess(workspaceId, req.user.id);

    const existing = await prisma.task.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (existing.taskType === 'OWNER_ASSIGNED' && membership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only the workspace owner can delete assigned tasks.' });
    }

    await prisma.task.delete({ where: { id } });

    return res.status(200).json({ message: 'Task deleted successfully.', id });
  } catch (error) {
    console.error('Error deleting task:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to delete task.' });
  }
}

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  reorderTasks,
  deleteTask,
};
