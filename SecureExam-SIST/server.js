require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb'); // MongoDB client
const mongoose = require('mongoose'); // MongoDB with Mongoose
const cors = require('cors'); // To handle CORS issues
const multer = require('multer'); // Import multer for file uploads
const path = require('path'); // For handling file paths

// Initialize the app
const app = express();
const PORT = 3000;

// Load environment variables
const MONGO_URI = process.env.MONGO_URI;

// Enable CORS
app.use(cors());

// Middleware
app.use(bodyParser.json()); // Parse incoming JSON requests
app.use(express.static('public')); // Serve static files from the "public" folder

// Set up Multer storage for Word file (e.g., .docx)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Files will be stored in the "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp as filename to avoid overwriting
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Only accept Word files
    const allowedTypes = /docx?/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only Word files are allowed'));
    }
  },
});

// MongoDB Connection (Mongoose for Models, MongoClient for other operations)
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB via Mongoose'))
  .catch((err) => console.error('Error connecting to MongoDB via Mongoose:', err));

let dbInstance = null; // MongoClient connection

async function connectToDatabase() {
  if (dbInstance) return dbInstance;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('Connected to MongoDB via MongoClient');
  dbInstance = client.db('Secure');
  return dbInstance;
}

// MongoDB Models (Mongoose)
const Student = mongoose.model('Student', new mongoose.Schema({
  registerNumber: String,
  userType: String,
  password: String,
  dept: String,
  class: String,
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
  department: String,
  class: String,
  examName: String,
  time: String,
}));

// Root route for the home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/html/index.html'); // Serve the home page (index.html)
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const db = await connectToDatabase();
    res.status(200).send('Database connected successfully!');
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).send('Failed to connect to the database');
  }
});

// Login route (Staff or Student)
app.post('/login', async (req, res) => {
  const { identifier, password, userType } = req.body;

  console.log('Login attempt:', { identifier, password, userType });

  try {
    const db = await connectToDatabase();
    const collectionName = userType === 'student' ? 'student' : 'staff';
    const collection = db.collection(collectionName);

    let query = userType === 'student'
      ? { registerNumber: parseInt(identifier, 10) }
      : { email: identifier };

    console.log('Query:', query);

    // Fetch user from the database
    const user = await collection.findOne(query);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'The username/password provided is not correct' });
    }

    // Direct password comparison (no hashing)
    if (password !== user.password) {
      console.log('Invalid password');
      return res.status(401).json({ message: 'The username/password provided is not correct' });
    }

    // Successful login
    console.log('Login successful');
    res.status(200).json({ message: 'Login successful!' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error!' });
  }
});

// Student Login Route (with Exam Validation)
app.post('/student-login', async (req, res) => {
  const { registerNumber, password } = req.body;

  try {
    // Find the student by registerNumber and password
    const student = await Student.findOne({ registerNumber, password });

    if (!student) {
      return res.status(404).json({ error: 'Invalid credentials' });
    }

    // Get the current active exam (based on department and class)
    const activeExam = await Exam.findOne({ department: student.dept, class: student.class });

    if (!activeExam) {
      return res.status(403).json({
        error: 'No active exams for your department and class',
      });
    }

    res.status(200).json({
      message: 'Login successful',
      student: {
        registerNumber: student.registerNumber,
        dept: student.dept,
        class: student.class,
      },
      activeExam,
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Exam Management Routes
app.post('/api/exam/start', upload.single('file'), async (req, res) => {
  const { name, time, department, section } = req.body;
  const file = req.file;

  try {
    const db = await connectToDatabase();
    const examCollection = db.collection('exams');

    // Save the exam details along with the file path in MongoDB
    const newExam = {
      name,
      time, // Time in minutes
      department,
      section,
      file: file ? file.path : '', // Store the file path
    };

    await examCollection.insertOne(newExam);

    console.log('Exam started and details saved:', newExam);

    res.json({ message: 'Exam started and details saved successfully' });
  } catch (error) {
    console.error('Error saving exam details:', error);
    res.status(500).json({ message: 'Error saving exam details to the database' });
  }
});

app.get('/api/exam/get', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const examCollection = db.collection('exams');

    // Assuming you want to get the latest exam
    const exam = await examCollection.findOne({}, { sort: { _id: -1 } });

    if (!exam) {
      return res.status(404).json({ message: 'No exam found' });
    }

    res.json(exam);
  } catch (error) {
    console.error('Error fetching exam details:', error);
    res.status(500).json({ message: 'Error fetching exam details from the database' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
