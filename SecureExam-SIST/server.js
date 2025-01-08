// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb'); // MongoDB client
const cors = require('cors'); // To handle CORS issues
require('dotenv').config(); // For environment variables

// Initialize the app
const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

// Middleware
app.use(bodyParser.json()); // Parse incoming JSON requests
app.use(express.static('public')); // Serve static files from the "public" folder

// Database connection function
async function connectToDatabase() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  return client.db('sample_mflix'); // Replace with your database name
}

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

// Login route
app.post('/login', async (req, res) => {
  const { identifier, password, userType } = req.body;

  console.log('Login attempt:', { identifier, password, userType });

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    let query;
    if (userType === 'student') {
      // Convert the identifier to an integer since registerNumber is stored as int
      const registerNumber = parseInt(identifier, 10); // Ensure it's an integer
      query = { registerNumber: registerNumber }; // For students
      console.log('Query for student (registerNumber):', query); // Debug log for student query
    } else if (userType === 'staff') {
      query = { email: identifier }; // For staff (identifier is email)
      console.log('Query for staff:', query); // Debug log for staff query
    }

    // Fetch user from the database based on the identifier
    const user = await usersCollection.findOne(query);

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'The username/password provided is not correct' });
    }

    // Ensure the password is compared correctly
    console.log('Checking password:', { userPassword: user.password, inputPassword: password });
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

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
