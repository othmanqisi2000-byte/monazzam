const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  addWorkspaceMember,
  createWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
} = require('../controllers/workspaceController');

const router = express.Router();

router.use(requireAuth);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:workspaceId/members', listWorkspaceMembers);
router.post('/:workspaceId/members', addWorkspaceMember);

module.exports = router;
