require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const rateLimit = require('express-rate-limit');
const os = require("os");
const fs = require("fs");
const app = express();


// Basic rate limiting for all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply to all requests
app.use(globalLimiter);

// More specific rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Get the system's IP address
const networkInterfaces = os.networkInterfaces();
let ipAddress = "127.0.0.1";

Object.keys(networkInterfaces).forEach((interfaceName) => {
  networkInterfaces[interfaceName].forEach((interface) => {
    if (interface.family === "IPv4" && !interface.internal) {
      ipAddress = interface.address;
    }
  });
});

// Load environment variables
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// MongoDB Connection (Mongoose + MongoClient)
mongoose
  .connect(MONGO_URI)
  .catch((err) => console.error("Mongoose connection error:", err));

let dbInstance = null;

async function connectToDatabase() {
  if (dbInstance) return dbInstance;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  dbInstance = client.db("Secure");
  return dbInstance;
}

// Define Mongoose Model
const Exam = mongoose.model(
  "exams",
  new mongoose.Schema({
    name: String,
    time: String,
    department: String,
    section: String,
    file: String,
  })
);

// Define Mongoose Model
const StudentModel = mongoose.model(
  "Student",
  new mongoose.Schema({
    registerNumber: Number,
    userName: String,
    department: String,
    section: String,
  }, { collection: "student" })
);

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/html/index.html");
});

// Login Route
app.post("/login", async (req, res) => {
  const { identifier, password, userType } = req.body;
  console.log("🔐 Login attempt:", { identifier, userType });

  try {
    const db = await connectToDatabase();
    const collectionName = userType === "student" ? "student" : "staff";
    const collection = db.collection(collectionName);

    let query =
      userType === "student"
        ? { registerNumber: parseInt(identifier, 10) }
        : { email: identifier };

    const user = await collection.findOne(query);
    if (!user || password !== user.password) {
      return res.status(401).json({ message: "Invalid Credentials!" });
    }

    if (userType === "student") {
      const exams = await db
        .collection("exams")
        .find({
          department: user.department,
          section: user.section,
        })
        .toArray();

      if (!exams.length) {
        return res
          .status(404)
          .json({ message: "No exams found for your department and section" });
      }

      const questions = await db
        .collection("exam_questions")
        .find({
          department: user.department,
          section: user.section,
        })
        .toArray();

      if (!questions.length) {
        return res.status(404).json({
          message: "No questions found for your department and section",
        });
      }

      const randomQuestion =
        questions[Math.floor(Math.random() * questions.length)];
      await db
        .collection("student")
        .updateOne(
          { registerNumber: parseInt(identifier, 10) },
          { $set: { assignedQuestion: randomQuestion.question } }
        );

      await db
        .collection("exam_questions")
        .deleteOne({ _id: randomQuestion._id });

      return res.status(200).json({
        message: "Login successful!",
        exams,
        assignedQuestion: randomQuestion.question,
        registerNumber: user.registerNumber,
      });
    }

    res.status(200).json({ message: "Login successful!" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error!" });
  }
});

// Fetch Exam Details for Student
app.get("/api/exam/get", async (req, res) => {
  try {
    const { registerNumber } = req.query;
    if (!registerNumber)
      return res.status(400).json({ message: "Register number is required" });

    const db = await connectToDatabase();
    const student = await db
      .collection("student")
      .findOne({ registerNumber: parseInt(registerNumber, 10) });

    if (!student) return res.status(404).json({ message: "Student not found" });

    const exams = await db
      .collection("exams")
      .find({
        department: student.department,
        section: student.section,
      })
      .toArray();

    if (!exams.length)
      return res
        .status(404)
        .json({ message: "No exams found for your department and section" });

    res.status(200).json({
      message: "Exams fetched successfully",
      exams,
      assignedQuestion: student.assignedQuestion || "No question assigned",
    });
  } catch (error) {
    console.error("Error fetching exam details:", error);
    res
      .status(500)
      .json({ message: "Error fetching exam details from the database" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const lines = buffer
      .toString("utf-8")
      .split("\n")
      .filter((line) => line.trim() !== "");

    for (let i = 0; i < lines.length; i++) {
      const row = lines[i].split(",").map((col) => col.trim());
      if (row.length >= 1) {
        results.push({
          question: row[0],
          nextQuestion:
            i + 1 < lines.length ? lines[i + 1].split(",")[0].trim() : null,
        });
      }
    }

    if (!results.length)
      reject(new Error("No valid questions found in the file"));
    resolve(results);
  });
};

app.post("/api/exam/start", upload.single("file"), async (req, res) => {
  const { name, time, department, section } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const db = await connectToDatabase();
    const examCollection = db.collection("exams");
    const questionCollection = db.collection("exam_questions");

    const existingExam = await examCollection.findOne({ department, section });

    if (existingExam) {
      return res
        .status(400)
        .json({
          message:
            "An exam is already scheduled for this department and section",
        });
    }

    let questions = [];

    const parseCSV = (buffer) => {
      return new Promise((resolve, reject) => {
        const results = [];
        const stream = buffer.toString("utf-8").trim().split("\n");

        for (let i = 0; i < stream.length; i++) {
          const row = stream[i]
            .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
            .map((col) => col.trim());

          if (row.length >= 1 && row[0]) {
            results.push({
              question: row[0],
              nextQuestion:
                i + 1 < stream.length
                  ? stream[i + 1]
                    .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)[0]
                    .trim()
                  : null,
            });
          }
        }

        if (results.length === 0) {
          return reject(new Error("No valid questions found in the file"));
        }

        resolve(results);
      });
    };

    questions = await parseCSV(file.buffer);

    if (questions.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid questions found in the file" });
    }

    let questionDocs = questions.map((q) => ({
      examName: name,
      department,
      section,
      question: q.question,
    }));

    await questionCollection.insertMany(questionDocs);

    await examCollection.insertOne({
      name,
      time,
      department,
      section,
    });

    console.log("📂 Questions Saved in database");
    res.json({ message: "Exam started and questions saved successfully." });
  } catch (error) {
    console.error("Error starting exam:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Finish Exam
app.post('/api/exam/finish', async (req, res) => {
  const { department, section } = req.body;

  if (!department || !section) {
    return res.status(400).json({ message: 'Department and Section are required' });
  }

  try {
    const db = await connectToDatabase();
    const examCollection = db.collection('exams');

    const result = await examCollection.deleteOne({ department, section });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No exam found matching the department and section' });
    }

    const questionCollection = db.collection('exam_questions');
    await questionCollection.deleteMany({ department, section });

    console.log('🗑️ Exam data deleted successfully for department:', department, 'and section:', section);

    res.status(200).json({ message: 'Exam data deleted successfully for the department and section' });

  } catch (error) {
    console.error('Error during finish exam:', error);
    res.status(500).json({ message: 'Internal server error!' });
  }
});


app.get("/api/students", async (req, res) => {
  try {
    const { department, section } = req.query;

    const students = await StudentModel.find({
      department: { $regex: `^${department}$`, $options: "i" },
      section: { $regex: `^${section}$`, $options: "i" }
    });

    if (students.length === 0) {
      return res.status(404).json({ error: "No students found" });
    }

    res.json(students);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// geting student code
app.post('/api/code/submit', async (req, res) => {
  try {
    let { registerNumber, language, code, assignedQuestion } = req.body;

    if (!registerNumber || !language || !code || !assignedQuestion) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    registerNumber = parseInt(registerNumber, 10);

    if (isNaN(registerNumber)) {
      return res.status(400).json({ message: 'Invalid register number format' });
    }

    const db = await connectToDatabase();
    const result = await db.collection('code').insertOne({
      registerNumber,
      language,
      code,
      assignedQuestion,
      submittedAt: new Date()
    });

    if (result.insertedId) {
      console.log("📝", registerNumber, "has completed and submitted the exam");
      res.json({ message: 'Code saved successfully' });
    } else {
      res.status(500).json({ message: 'Failed to save code' });
    }
  } catch (error) {
    console.error('Error saving code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Define the Code Schema
const codeSchema = new mongoose.Schema({
  registerNumber: { type: String, required: true },
  language: { type: String, required: true },
  code: { type: String, required: true },
  assignedQuestion: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now }
});

const Code = mongoose.model("Code", codeSchema, "code");

// Fetch all code submissions
app.get("/api/all-codes", async (req, res) => {
  try {

    const codeDocuments = await Code.find({});

    if (!codeDocuments || codeDocuments.length === 0) {
      return res.status(404).json({ message: "No code submissions found" });
    }

    res.json(codeDocuments);
  } catch (error) {
    console.error("Error fetching code submissions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start the server
const PORT = 80;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌍 Server is live at http://${ipAddress}:${PORT}`);
});