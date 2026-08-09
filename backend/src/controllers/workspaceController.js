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

    const pendingInvites = await prisma.workspaceInvite.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
      },
      include: {
        invitee: {
          select: {
            id: true,
            name: true,
            email: true,
            reminderEmail: true,
            createdAt: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json({
      members: members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        reminderEmail: member.user.reminderEmail,
        role: member.role,
        joinedAt: member.createdAt,
      })),
      pendingInvites: pendingInvites.map((invite) => ({
        id: invite.id,
        inviteeId: invite.invitee.id,
        name: invite.invitee.name,
        email: invite.invitee.email,
        reminderEmail: invite.invitee.reminderEmail,
        invitedAt: invite.createdAt,
        invitedByName: invite.inviter.name,
      })),
    });
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

    const existingInvite = await prisma.workspaceInvite.findUnique({
      where: {
        workspaceId_inviteeId: {
          workspaceId,
          inviteeId: user.id,
        },
      },
      include: {
        invitee: {
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

    if (existingInvite?.status === 'PENDING') {
      return res.status(409).json({ error: 'This user already has a pending invitation.' });
    }

    const invite = await prisma.workspaceInvite.upsert({
      where: {
        workspaceId_inviteeId: {
          workspaceId,
          inviteeId: user.id,
        },
      },
      update: {
        inviterId: req.user.id,
        status: 'PENDING',
        respondedAt: null,
      },
      create: {
        workspaceId,
        inviterId: req.user.id,
        inviteeId: user.id,
      },
      include: {
        invitee: {
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
      id: invite.id,
      inviteeId: invite.invitee.id,
      name: invite.invitee.name,
      email: invite.invitee.email,
      reminderEmail: invite.invitee.reminderEmail,
      invitedAt: invite.createdAt,
      message: 'Invitation sent successfully.',
    });
  } catch (error) {
    console.error('Add workspace member error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to send invitation.' });
  }
}

async function listMyWorkspaceInvites(req, res) {
  try {
    const invites = await prisma.workspaceInvite.findMany({
      where: {
        inviteeId: req.user.id,
        status: 'PENDING',
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.status(200).json(
      invites.map((invite) => ({
        id: invite.id,
        workspaceId: invite.workspace.id,
        workspaceName: invite.workspace.name,
        ownerId: invite.workspace.ownerId,
        invitedByName: invite.inviter.name,
        invitedByEmail: invite.inviter.email,
        invitedAt: invite.createdAt,
      }))
    );
  } catch (error) {
    console.error('List my workspace invites error:', error);
    return res.status(500).json({ error: 'Failed to load invitations.' });
  }
}

async function respondToWorkspaceInvite(req, res) {
  try {
    const { inviteId } = req.params;
    const { action } = req.body;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'A valid invitation action is required.' });
    }

    const invite = await prisma.workspaceInvite.findFirst({
      where: {
        id: inviteId,
        inviteeId: req.user.id,
        status: 'PENDING',
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    if (action === 'decline') {
      await prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      return res.status(200).json({
        id: invite.id,
        workspaceId: invite.workspaceId,
        status: 'DECLINED',
        message: 'Invitation declined.',
      });
    }

    await prisma.$transaction(async (tx) => {
      const existingMembership = await tx.workspaceMember.findFirst({
        where: {
          workspaceId: invite.workspaceId,
          userId: req.user.id,
        },
      });

      if (!existingMembership) {
        await tx.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: req.user.id,
            role: 'MEMBER',
          },
        });
      }

      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });
    });

    return res.status(200).json({
      id: invite.id,
      workspaceId: invite.workspaceId,
      status: 'ACCEPTED',
      message: 'Invitation accepted.',
    });
  } catch (error) {
    console.error('Respond to workspace invite error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to respond to invitation.' });
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

async function deleteWorkspace(req, res) {
  try {
    const { workspaceId } = req.params;
    await requireWorkspaceAccess(workspaceId, req.user.id, { ownerOnly: true });

    const ownedWorkspaceCount = await prisma.workspace.count({
      where: { ownerId: req.user.id },
    });

    if (ownedWorkspaceCount <= 1) {
      return res.status(400).json({
        error: 'You must keep at least one active community.',
      });
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return res.status(200).json({
      id: workspaceId,
      message: 'Community deleted successfully.',
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Failed to delete community.' });
  }
}

module.exports = {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  listMyWorkspaceInvites,
  listWorkspaceMembers,
  listWorkspaces,
  respondToWorkspaceInvite,
};
