import express from 'express';
import { runCodeController } from '../controllers/codeExecutionController';
import { verifyToken } from '../middleware/jwtMiddleware';

const router = express.Router();

// verifyToken ensures only authenticated students can run code
router.post('/run', verifyToken, runCodeController);

export default router;
