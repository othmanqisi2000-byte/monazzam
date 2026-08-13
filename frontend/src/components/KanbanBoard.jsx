import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus, AlertCircle, Loader2, Mail } from 'lucide-react';
import Column from './Column.jsx';
import TaskModal from './TaskModal.jsx';
import EmailSettingsModal from './EmailSettingsModal.jsx';
import WorkspacePanel from './WorkspacePanel.jsx';
import TaskCard from './TaskCard.jsx';
import { taskApi } from '../services/api.js';

const COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
];

function reindex(taskList) {
  return taskList.map((t, index) => ({ ...t, order: index }));
}

function createEmptyColumns() {
  return { TODO: [], IN_PROGRESS: [], DONE: [] };
}

function groupTasksByColumn(tasks) {
  const grouped = createEmptyColumns();
  for (const task of tasks) {
    if (grouped[task.status]) {
      grouped[task.status].push(task);
    }
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.order - b.order);
  }

  return grouped;
}

function buildAssignedOverview(tasks) {
  const overviewMap = new Map();

  for (const task of tasks) {
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

  return Array.from(overviewMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
}

function KanbanBoard({
  currentUser,
  workspaces,
  pendingInvitations,
  onRefreshWorkspaces,
  onUpdateWorkspace,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onDeleteWorkspace,
  onLeaveWorkspace,
  onRespondToInvitation,
  onLoadWorkspaceMembers,
  onAddWorkspaceMember,
  reminderEmail,
  onSaveReminderEmail,
}) {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null;
  const isOwner = activeWorkspace?.role === 'OWNER';
  const isAssignedOnlyWorkspace = activeWorkspace?.taskMode === 'OWNER_ASSIGNED_ONLY';
  const canCreateTasks = Boolean(activeWorkspaceId) && (!isAssignedOnlyWorkspace || isOwner);

  const [sharedTasks, setSharedTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, task: null, defaultStatus: 'TODO' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isEmailSettingsOpen, setIsEmailSettingsOpen] = useState(false);
  const lastLoadedWorkspaceIdRef = useRef('');

  const loadTasks = useCallback(async () => {
    if (!activeWorkspaceId) {
      setSharedTasks([]);
      setAssignedTasks([]);
      setIsLoading(false);
      lastLoadedWorkspaceIdRef.current = '';
      return;
    }

    const isSwitchingWorkspace = lastLoadedWorkspaceIdRef.current !== activeWorkspaceId;
    const hasBoardData =
      sharedTasks.length > 0 || assignedTasks.length > 0;

    if (isSwitchingWorkspace || !hasBoardData) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await taskApi.getAllTasks(activeWorkspaceId);
      setSharedTasks(data.sharedTasks || []);
      setAssignedTasks(data.assignedTasks || []);
      lastLoadedWorkspaceIdRef.current = activeWorkspaceId;
      if (data.workspaceTaskMode && activeWorkspace?.taskMode !== data.workspaceTaskMode) {
        onUpdateWorkspace?.(activeWorkspaceId, { taskMode: data.workspaceTaskMode });
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [
    activeWorkspace?.taskMode,
    activeWorkspaceId,
    assignedTasks.length,
    onUpdateWorkspace,
    sharedTasks.length,
  ]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const sharedTasksByColumn = useMemo(() => groupTasksByColumn(sharedTasks), [sharedTasks]);
  const assignedTasksByColumn = useMemo(() => groupTasksByColumn(assignedTasks), [assignedTasks]);
  const assignedOverview = useMemo(
    () => (isOwner ? buildAssignedOverview(assignedTasks) : []),
    [assignedTasks, isOwner]
  );

  const handleOwnerAssignedDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const parseDroppable = (droppableId) => {
      const [, userId, status] = droppableId.split('::');
      return { userId, status };
    };

    const sourceMeta = parseDroppable(source.droppableId);
    const destMeta = parseDroppable(destination.droppableId);

    if (!sourceMeta.userId || sourceMeta.userId !== destMeta.userId) {
      setError('Each member copy can only be moved within that member board.');
      return;
    }

    const previousTasks = assignedTasks;
    const memberTasks = assignedTasks.filter((task) => task.assigneeId === sourceMeta.userId);
    const otherTasks = assignedTasks.filter((task) => task.assigneeId !== sourceMeta.userId);
    const grouped = groupTasksByColumn(memberTasks);

    const sourceList = [...grouped[sourceMeta.status]];
    const [movedTask] = sourceList.splice(source.index, 1);

    let destList;
    if (sourceMeta.status === destMeta.status) {
      destList = sourceList;
      destList.splice(destination.index, 0, { ...movedTask, status: destMeta.status });
    } else {
      destList = [...grouped[destMeta.status]];
      destList.splice(destination.index, 0, { ...movedTask, status: destMeta.status });
    }

    const reindexedSource = reindex(sourceList);
    const reindexedDest =
      sourceMeta.status === destMeta.status ? reindexedSource : reindex(destList);
    const untouchedMemberTasks = memberTasks.filter(
      (task) => task.status !== sourceMeta.status && task.status !== destMeta.status
    );

    const nextAssignedTasks =
      sourceMeta.status === destMeta.status
        ? [...otherTasks, ...untouchedMemberTasks, ...reindexedDest]
        : [...otherTasks, ...untouchedMemberTasks, ...reindexedSource, ...reindexedDest];

    setAssignedTasks(nextAssignedTasks);
    setIsSavingOrder(true);
    setError(null);

    const affectedTasks =
      sourceMeta.status === destMeta.status
        ? reindexedDest.map((task) => ({ id: task.id, status: task.status, order: task.order }))
        : [...reindexedSource, ...reindexedDest].map((task) => ({
            id: task.id,
            status: task.status,
            order: task.order,
          }));

    try {
      await taskApi.reorderTasks(activeWorkspaceId, affectedTasks);
    } catch (err) {
      setError(err.message || 'Failed to save the new order. Reverting.');
      setAssignedTasks(previousTasks);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDragEnd = async (result, boardType) => {
    const { source, destination } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStatus = source.droppableId.replace(`${boardType}-`, '');
    const destStatus = destination.droppableId.replace(`${boardType}-`, '');
    const stateSetter = boardType === 'shared' ? setSharedTasks : setAssignedTasks;
    const taskList = boardType === 'shared' ? sharedTasks : assignedTasks;
    const tasksByColumn = boardType === 'shared' ? sharedTasksByColumn : assignedTasksByColumn;

    const previousTasks = taskList;
    const sourceList = [...tasksByColumn[sourceStatus]];
    const [movedTask] = sourceList.splice(source.index, 1);

    let destList;
    if (sourceStatus === destStatus) {
      destList = sourceList;
      destList.splice(destination.index, 0, { ...movedTask, status: destStatus });
    } else {
      destList = [...tasksByColumn[destStatus]];
      destList.splice(destination.index, 0, { ...movedTask, status: destStatus });
    }

    const reindexedSource = reindex(sourceList);
    const reindexedDest = sourceStatus === destStatus ? reindexedSource : reindex(destList);
    const otherTasks = taskList.filter((t) => t.status !== sourceStatus && t.status !== destStatus);
    const nextTasks =
      sourceStatus === destStatus
        ? [...otherTasks, ...reindexedDest]
        : [...otherTasks, ...reindexedSource, ...reindexedDest];

    stateSetter(nextTasks);
    setIsSavingOrder(true);
    setError(null);

    const affectedTasks =
      sourceStatus === destStatus
        ? reindexedDest.map((t) => ({ id: t.id, status: t.status, order: t.order }))
        : [...reindexedSource, ...reindexedDest].map((t) => ({
            id: t.id,
            status: t.status,
            order: t.order,
          }));

    try {
      await taskApi.reorderTasks(activeWorkspaceId, affectedTasks);
    } catch (err) {
      setError(err.message || 'Failed to save the new order. Reverting.');
      stateSetter(previousTasks);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const openCreateModal = (status) => {
    setModalState({ isOpen: true, task: null, defaultStatus: status });
  };

  const openEditModal = (task) => {
    setModalState({ isOpen: true, task, defaultStatus: task.status });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, task: null, defaultStatus: 'TODO' });
  };

  const handleModalSubmit = async (formData) => {
    if (modalState.task) {
      const updated = await taskApi.updateTask(activeWorkspaceId, modalState.task.id, formData);
      if (updated.taskType === 'OWNER_ASSIGNED') {
        setAssignedTasks((prev) =>
          prev.map((t) =>
            t.id === updated.id
              ? {
                  ...t,
                  ...updated,
                  assignee: t.assignee,
                }
              : t
          )
        );
      } else {
        setSharedTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
      return;
    }

    const created = await taskApi.createTask(activeWorkspaceId, formData);
    if (Array.isArray(created)) {
      onUpdateWorkspace?.(activeWorkspaceId, { taskMode: 'OWNER_ASSIGNED_ONLY' });
      await onRefreshWorkspaces?.(activeWorkspaceId);
      await loadTasks();
      return;
    }

    setSharedTasks((prev) => [...prev, created]);
  };

  const requestDelete = (task) => setDeleteTarget(task);
  const cancelDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const isAssigned = deleteTarget.taskType === 'OWNER_ASSIGNED';
    const previousTasks = isAssigned ? assignedTasks : sharedTasks;
    const stateSetter = isAssigned ? setAssignedTasks : setSharedTasks;

    stateSetter((prev) => prev.filter((t) => t.id !== deleteTarget.id));
    setDeleteTarget(null);

    try {
      await taskApi.deleteTask(activeWorkspaceId, deleteTarget.id);
      if (isOwner && isAssigned) {
        await loadTasks();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
      stateSetter(previousTasks);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading board...
      </div>
    );
  }

  return (
    <div>
      <WorkspacePanel
        workspaces={workspaces}
        pendingInvitations={pendingInvitations}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
        onDeleteWorkspace={onDeleteWorkspace}
        onLeaveWorkspace={onLeaveWorkspace}
        onRespondToInvitation={onRespondToInvitation}
        onLoadMembers={onLoadWorkspaceMembers}
        onAddMember={onAddWorkspaceMember}
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex justify-end items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setIsEmailSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md border border-slate-200"
          title={reminderEmail ? `Reminders sent to ${reminderEmail}` : 'Set a reminder email'}
        >
          <Mail size={16} />
          {reminderEmail ? reminderEmail : 'Set Reminder Email'}
        </button>
        <button
          type="button"
          onClick={() => openCreateModal('TODO')}
          disabled={!canCreateTasks}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
        >
          <Plus size={16} />
          {isAssignedOnlyWorkspace ? 'Add Member Task' : 'Add Task'}
        </button>
      </div>

      {activeWorkspaceId ? (
        <>
          {!isAssignedOnlyWorkspace && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Shared Tasks</h2>
                  <p className="text-sm text-slate-500">These tasks stay visible to everyone in the community.</p>
                </div>
              </div>
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'shared')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {COLUMNS.map((col) => (
                    <Column
                      key={`shared-${col.id}`}
                      columnId={col.id}
                      droppableId={`shared-${col.id}`}
                      title={col.title}
                      tasks={sharedTasksByColumn[col.id]}
                      onAddTask={openCreateModal}
                      onEditTask={openEditModal}
                      onDeleteTask={requestDelete}
                    />
                  ))}
                </div>
              </DragDropContext>
            </section>
          )}

          {!isOwner && isAssignedOnlyWorkspace && (
            <section className="mt-8">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-slate-800">My Assigned Tasks</h2>
                <p className="text-sm text-slate-500">
                  This workspace only uses separate member copies. Your progress here is independent from everyone else.
                </p>
              </div>
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'assigned')}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {COLUMNS.map((col) => (
                    <Column
                      key={`assigned-${col.id}`}
                      columnId={col.id}
                      droppableId={`assigned-${col.id}`}
                      title={col.title}
                      tasks={assignedTasksByColumn[col.id]}
                      onAddTask={openCreateModal}
                      onEditTask={openEditModal}
                      onDeleteTask={requestDelete}
                      showAddButton={false}
                      taskCardProps={{ canDelete: false }}
                    />
                  ))}
                </div>
              </DragDropContext>
            </section>
          )}

          {isOwner && (
            <section className="mt-8">
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-slate-800">Member Progress</h2>
                <p className="text-sm text-slate-500">
                  Assigned tasks create a separate copy for each member. You can watch their progress here.
                </p>
              </div>

              {assignedOverview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
                  No assigned member tasks yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedOverview.map((member) => (
                    <div key={member.userId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-800">{member.userName}</h3>
                          <p className="text-sm text-slate-500">{member.userEmail}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">To Do {member.counts.TODO}</span>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">In Progress {member.counts.IN_PROGRESS}</span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Done {member.counts.DONE}</span>
                        </div>
                      </div>
                      <DragDropContext onDragEnd={handleOwnerAssignedDragEnd}>
                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                          {COLUMNS.map((column) => {
                            const memberTasks = member.tasks.filter((task) => task.status === column.id);
                            return (
                              <Column
                                key={`${member.userId}-${column.id}`}
                                columnId={column.id}
                                droppableId={`owner::${member.userId}::${column.id}`}
                                title={column.title}
                                tasks={memberTasks}
                                onAddTask={openCreateModal}
                                onEditTask={openEditModal}
                                onDeleteTask={requestDelete}
                                showAddButton={false}
                                taskCardProps={{ assigneeLabel: member.userName }}
                              />
                            );
                          })}
                        </div>
                      </DragDropContext>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          Create or choose a workspace to start collaborating on tasks.
        </div>
      )}

      {isSavingOrder && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-md">
          <Loader2 className="animate-spin" size={12} />
          Saving...
        </div>
      )}

      <TaskModal
        isOpen={modalState.isOpen}
        task={modalState.task}
        defaultStatus={modalState.defaultStatus}
        globalReminderEmail={reminderEmail}
        canCreateAssignedTask={isOwner}
        lockTaskType={isAssignedOnlyWorkspace ? 'OWNER_ASSIGNED' : ''}
        onOpenEmailSettings={() => setIsEmailSettingsOpen(true)}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />

      <EmailSettingsModal
        isOpen={isEmailSettingsOpen}
        currentEmail={reminderEmail}
        onClose={() => setIsEmailSettingsOpen(false)}
        onSave={onSaveReminderEmail}
      />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onClick={cancelDelete}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 mb-2">Delete task?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete "{deleteTarget.title}". This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KanbanBoard;
