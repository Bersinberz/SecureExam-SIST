import express from "express";
import { downloadAllSubmissions, getStudentsByFilter, getSubmissionByRegisterNumber } from "../controllers/tableController";
import { verifyToken, requireRole } from "../middleware/jwtMiddleware";

const router = express.Router();

// All table endpoints are staff-only
router.get("/students",                  verifyToken, requireRole(["staff"]), getStudentsByFilter);
router.get("/submissions/:registerNumber", verifyToken, requireRole(["staff"]), getSubmissionByRegisterNumber);
router.get("/download-submissions",      verifyToken, requireRole(["staff"]), downloadAllSubmissions);

export default router;
