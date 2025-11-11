import express from "express";
import { downloadAllSubmissions, getStudentsByFilter, getSubmissionByRegisterNumber } from "../controllers/tableController";
import { verifyToken } from "../middleware/jwtMiddleware";

const router = express.Router();

// GET filtered students
router.get("/students", verifyToken, getStudentsByFilter);
router.get("/submissions/:registerNumber", getSubmissionByRegisterNumber);
router.get('/download-submissions', downloadAllSubmissions);

export default router;
