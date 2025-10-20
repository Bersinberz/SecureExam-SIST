import express from 'express';
import { runCodeController } from '../controllers/codeExecutionController';

const router = express.Router();

router.post('/run', runCodeController);

export default router;