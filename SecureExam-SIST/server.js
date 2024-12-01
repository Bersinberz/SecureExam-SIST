const express = require('express');
const bodyParser = require('body-parser');
const connectToDatabase = require('./db'); // Import the database connection logic

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());  // Parse incoming JSON requests
app.use(express.static('public'));

// Login Route
app.post('/login', async (req, res) => {
  const { registerNumber, password } = req.body;

  if (!registerNumber || !password) {
    return res.status(400).json({ message: 'Register number and password are required!' });
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if the user exists by register number
    const user = await usersCollection.findOne({ registerNumber });

    if (!user) {
      // Register number does not exist
      return res.status(404).json({ message: 'Invalid register number!' });
    }

    if (user.password !== password) {
      // Password does not match
      return res.status(401).json({ message: 'Invalid password!' });
    }

    // Login successful
    res.status(200).json({ message: 'Login successful!' });
  } catch (error) {
    // Internal server error
    res.status(500).json({ message: 'Internal server error!' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));