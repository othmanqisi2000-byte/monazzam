const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  addWorkspaceMember,
  createWorkspace,
  deleteWorkspace,
  leaveWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.delete('/:workspaceId', deleteWorkspace);
router.get('/:workspaceId/members', listWorkspaceMembers);
router.post('/:workspaceId/members', addWorkspaceMember);
router.delete('/:workspaceId/members/me', leaveWorkspace);

module.exports = router;
