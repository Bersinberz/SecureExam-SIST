import express from 'express';
import { getExam, startExam, finishExam } from '../controllers/examController';
import { upload } from '../middleware/upload';

const router = express.Router();

router.get('/get', getExam);
router.post('/start', upload.single("file"), startExam);
router.post('/finish', finishExam);

export default router;