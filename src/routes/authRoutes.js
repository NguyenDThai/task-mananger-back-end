import express from 'express';

import uploadCloud from '../../cloudinaryConfig.js';
import {
  login,
  register,
  getMe,
  logout,
  getAllUsers,
  updateAvatar,
} from '../controller/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);
router.get('/users', protect, getAllUsers);
router.post('/logout', logout);
router.post('/update-avatar/:userId', protect, uploadCloud.single('avatar'), updateAvatar);

export default router;
