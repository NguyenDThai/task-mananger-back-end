import express from 'express';

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  bulkDeleteTasks,
  getTaskStats,
} from '../controller/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Task routes
router.post('/', protect, createTask);
router.get('/', protect, getTasks);
router.get('/stats', protect, getTaskStats);
router.get('/:id', protect, getTaskById);
router.patch('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);
router.post('/bulk-delete', protect, bulkDeleteTasks);

export default router;
