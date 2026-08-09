const prisma = require('../lib/prisma');
const { requireWorkspaceAccess } = require('../lib/workspaceAccess');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listWorkspaces(req, res) {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.user.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(
      memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role,
        ownerId: membership.workspace.ownerId,
        memberCount: membership.workspace._count.members,
        taskCount: membership.workspace._count.tasks,
        createdAt: membership.workspace.createdAt,
        updatedAt: membership.workspace.updatedAt,
      }))
    );
  } catch (error) {
    console.error('List workspaces error:', error);
    return res.status(500).json({ error: 'Failed to load workspaces.' });
  }
}

async function createWorkspace(req, res) {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const createdWorkspace = await tx.workspace.create({
        data: {
          name: String(name).trim(),
          ownerId: req.user.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: createdWorkspace.id,
          userId: req.user.id,
          role: 'OWNER',
        },
      });

      return createdWorkspace;
    });

    return res.status(201).json({
      id: workspace.id,
      name: workspace.name,
      role: 'OWNER',
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      memberCount: 1,
      taskCount: 0,
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    return res.status(500).json({ error: 'Failed to create workspace.' });
  }
}

async function listWorkspaceMembers(req, res) {
  try {
    const { workspaceId } = req.params;
    await requireWorkspaceAccess(workspaceId, req.user.id);

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reminderEmail: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return res.status(200).json(
      members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        reminderEmail: member.user.reminderEmail,
        role: member.role,
        joinedAt: member.createdAt,
      }))
    );
  } catch (error) {
    console.error('List workspace members error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to load members.' });
  }
}

async function addWorkspaceMember(req, res) {
  try {
    const { workspaceId } = req.params;
    const { email } = req.body;

    await requireWorkspaceAccess(workspaceId, req.user.id, { ownerOnly: true });

    if (!email || !EMAIL_REGEX.test(String(email).trim().toLowerCase())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'No registered user found with this email.' });
    }

    const existingMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (existingMembership) {
      return res.status(409).json({ error: 'This user is already in the workspace.' });
    }

    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reminderEmail: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(201).json({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      reminderEmail: member.user.reminderEmail,
      role: member.role,
      joinedAt: member.createdAt,
    });
  } catch (error) {
    console.error('Add workspace member error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to add member.' });
  }
}

async function leaveWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    const membership = await requireWorkspaceAccess(workspaceId, req.user.id);

    if (membership.role === 'OWNER') {
      return res.status(400).json({
        error: 'Workspace owners cannot leave their own community.',
      });
    }

    await prisma.workspaceMember.deleteMany({
      where: {
        workspaceId,
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      id: workspaceId,
      message: 'You left the community successfully.',
    });
  } catch (error) {
    console.error('Leave workspace error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to leave community.' });
  }
}

module.exports = {
  addWorkspaceMember,
  createWorkspace,
  leaveWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
};
