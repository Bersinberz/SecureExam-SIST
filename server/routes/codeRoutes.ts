import express from "express";
import { getExamData, submitCode } from "../controllers/codeController";

const router = express.Router();

router.get("/getdata", getExamData)
router.post('/submit', submitCode);

export default router;