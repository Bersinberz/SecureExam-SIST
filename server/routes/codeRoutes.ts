import express from "express";
import { getExamData } from "../controllers/codeController";

const router = express.Router();

router.get("/getdata", getExamData)

export default router;