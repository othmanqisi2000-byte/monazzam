const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  listMyWorkspaceInvites,
  listWorkspaceMembers,
  listWorkspaces,
  respondToWorkspaceInvite,
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/invitations/me', listMyWorkspaceInvites);
router.patch('/invitations/:inviteId', respondToWorkspaceInvite);
router.delete('/:workspaceId', deleteWorkspace);
router.get('/:workspaceId/members', listWorkspaceMembers);
router.post('/:workspaceId/members', addWorkspaceMember);
router.delete('/:workspaceId/members/me', leaveWorkspace);

module.exports = router;
