import express from 'express';
import { submitCode, getAllCodes } from '../controllers/codeController';

const router = express.Router();

router.post('/submit', submitCode);
router.get('/all-codes', getAllCodes);

export default router;