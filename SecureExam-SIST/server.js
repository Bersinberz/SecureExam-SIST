const express = require('express');
const bodyParser = require('body-parser');
const connectToDatabase = require('./db'); // Import the database connection logic

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());  // Parse incoming JSON requests
app.use(express.static('public')); // Serve static files from the 'public' folder

// Login Route
app.post('/login', async (req, res) => {
  const { registerNumber, password } = req.body;

  if (!registerNumber || !password) {
    return res.status(400).json({ message: 'Register number and password are required!' });
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');  // Replace 'users' with your MongoDB collection name
    const user = await usersCollection.findOne({ registerNumber });

    if (user && user.password === password) {
      res.status(200).json({ message: 'Login successful!' });
    } else {
      res.status(401).json({ message: 'Invalid register number or password!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error!' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
