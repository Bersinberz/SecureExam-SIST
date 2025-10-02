import express from 'express';
import multer from 'multer';
// import { getExam, startExam, finishExam } from '../controllers/sampleController';
import { createExam } from '../controllers/examController';
import { verifyToken } from '../middleware/jwtMiddleware';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/create', upload.single('file'), createExam, verifyToken);
// router.get('/get', getExam);
// router.post('/start', upload.single("file"), startExam);
// router.post('/finish', finishExam);

export default router;