import { Router } from 'express';
import authRoutes from './auth.routes.js';
import contactRoutes from './contact.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);
router.use('/health', healthRoutes);

export default router;
