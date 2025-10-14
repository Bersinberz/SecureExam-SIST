import express from "express";
import { getStudentsByFilter } from "../controllers/tableController";
import { verifyToken } from "../middleware/jwtMiddleware";

const router = express.Router();

// GET filtered students
router.get("/students", verifyToken, getStudentsByFilter);

export default router;
