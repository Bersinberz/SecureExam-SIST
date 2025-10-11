import express from 'express';
import multer from 'multer';
import { createExam } from '../controllers/examController';
import { verifyToken } from '../middleware/jwtMiddleware';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/create', upload.single('file'), verifyToken, createExam);

export default router;