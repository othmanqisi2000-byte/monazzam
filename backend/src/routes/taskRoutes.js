const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  reorderTasks,
  deleteTask,
} = require('../controllers/taskController');

// IMPORTANT: /reorder is registered before /:id-style routes of the same
// method to avoid any accidental path-matching ambiguity.
router.get('/', getAllTasks);
router.post('/', createTask);
router.put('/reorder', reorderTasks);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
