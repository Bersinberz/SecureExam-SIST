import express from 'express';
import { getExam, startExam, finishExam } from '../controllers/sampleController';
import { upload } from '../middleware/upload';
import { createExam } from '../controllers/examController';

const router = express.Router();

router.post('/create', createExam)
router.get('/get', getExam);
router.post('/start', upload.single("file"), startExam);
router.post('/finish', finishExam);

export default router;