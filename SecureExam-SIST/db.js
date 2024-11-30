const { MongoClient } = require('mongodb');
require('dotenv').config(); // Loads the environment variables from .env

const uri = process.env.MONGO_URI;  // Fetch the MongoDB URI from .env
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  if (!db) {
    try {
      await client.connect();  // Connect to MongoDB Atlas
      console.log('Connected to MongoDB Atlas');
      db = client.db('SecureExam');  // Database name should be 'SecureExam'
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }
  return db;
}

module.exports = connectToDatabase;  // Export the connection function