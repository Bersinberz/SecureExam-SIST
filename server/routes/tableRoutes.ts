import express from "express";
import { getStudentsByFilter } from "../controllers/tableController";

const router = express.Router();

// GET filtered students
router.get("/students", getStudentsByFilter); // /api/students?department=...&section=...&year=...

export default router;
