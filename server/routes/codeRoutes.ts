import express from "express";
import { getExamData, submitCode } from "../controllers/codeController";
import { verifyToken, requireRole } from "../middleware/jwtMiddleware";

const router = express.Router();

// Both endpoints require a valid student token
router.get("/getdata", verifyToken, requireRole(["student"]), getExamData);
router.post("/submit",  verifyToken, requireRole(["student"]), submitCode);

export default router;
