import express from 'express';
import { login } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimit';

const router = express.Router();

router.post('/login', login);

export default router;