import express from 'express';

import { createTask, getTasks } from '../controller/taskController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Task routes
router.post('/', protect, createTask);
router.get('/', protect, getTasks);

export default router;
