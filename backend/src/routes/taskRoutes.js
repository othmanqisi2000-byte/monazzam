const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  reorderTasks,
  deleteTask,
} = require('../controllers/taskController');
const { requireAuth } = require('../middleware/authMiddleware');

// IMPORTANT: /reorder is registered before /:id-style routes of the same
// method to avoid any accidental path-matching ambiguity.
router.use(requireAuth);

router.get('/', getAllTasks);
router.post('/', createTask);
router.put('/reorder', reorderTasks);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
