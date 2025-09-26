import express from 'express';
import { uploadImage, deleteImage } from '../controllers/upload.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// Upload image route (protected)
router.post('/image', protectRoute, upload.single('image'), uploadImage);

// Delete image route (protected)
router.delete('/image', protectRoute, deleteImage);

export default router;
