// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs'); // Import bcryptjs for password hashing
const { body, validationResult } = require('express-validator'); // Import validation
const connectToDatabase = require('./db'); // Import the database connection logic

// Initialize the app
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json()); // Parse incoming JSON requests
app.use(express.static('public')); // Serve static files from the "public" folder

// Login Route with Validation, Debugging, and Password Hashing
app.post(
  '/login',
  [
    // Validate and sanitize inputs
    body('registerNumber').notEmpty().withMessage('Register number is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { registerNumber, password } = req.body;

    // Debugging: Log input values
    console.log("Login Attempt:", { registerNumber, password });

    try {
      // Connect to the database
      const db = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Debugging: Log query execution
      console.log("Searching for user:", registerNumber);

      // Find user by register number
      const user = await usersCollection.findOne({ registerNumber });

      if (!user) {
        console.log("User not found:", registerNumber); // Debugging: User not found
        return res.status(404).json({ message: 'Invalid register number!' });
      }

      // Compare password with hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log("Invalid password for:", registerNumber); // Debugging: Password mismatch
        return res.status(401).json({ message: 'Invalid password!' });
      }

      // Login successful
      console.log("Login successful for:", registerNumber); // Debugging: Success
      res.status(200).json({ message: 'Login successful!' });
    } catch (error) {
      console.error("Database error:", error); // Debugging: Log database errors
      res.status(500).json({ message: 'Internal server error!' });
    }
  }
);

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

