import express from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout } from '../controllers/authController';
import { verifyToken } from '../middleware/jwtMiddleware';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login',  loginLimiter, login);
router.post('/logout', verifyToken,  logout);

export default router;
