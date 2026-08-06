const prisma = require('./prisma');

async function getWorkspaceMembership(workspaceId, userId) {
  if (!workspaceId) {
    return null;
  }

  return prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

async function requireWorkspaceAccess(workspaceId, userId, options = {}) {
  const membership = await getWorkspaceMembership(workspaceId, userId);

  if (!membership) {
    const error = new Error('Workspace not found or access denied.');
    error.status = 404;
    throw error;
  }

  if (options.ownerOnly && membership.role !== 'OWNER') {
    const error = new Error('Only the workspace owner can perform this action.');
    error.status = 403;
    throw error;
  }

  return membership;
}

function serializeWorkspaceMembership(membership) {
  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    role: membership.role,
    ownerId: membership.workspace.ownerId,
    createdAt: membership.workspace.createdAt,
    updatedAt: membership.workspace.updatedAt,
  };
}

module.exports = {
  getWorkspaceMembership,
  requireWorkspaceAccess,
  serializeWorkspaceMembership,
};
