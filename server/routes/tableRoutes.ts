import express from "express";
import { downloadAllSubmissions, getStudentsByFilter, getSubmissionByRegisterNumber } from "../controllers/tableController";
import { verifyToken } from "../middleware/jwtMiddleware";

const router = express.Router();

router.get("/students", verifyToken, getStudentsByFilter);
router.get("/submissions/:registerNumber", verifyToken, getSubmissionByRegisterNumber);
router.get('/download-submissions', verifyToken, downloadAllSubmissions);

export default router;
