const { MongoClient } = require('mongodb');
require('dotenv').config(); // Load environment variables

const uri = process.env.MONGO_URI; // Fetch MongoDB URI from .env
const client = new MongoClient(uri); // No need to pass deprecated options

let db;

async function connectToDatabase() {
  if (!db) {
    try {
      await client.connect(); // Connect to MongoDB
      console.log('Connected to MongoDB');
      db = client.db('sample_mflix'); // Use the correct database name
    } catch (error) {
      console.error('Database connection error:', error.message);
      throw error;
    }
  }
  return db;
}

module.exports = connectToDatabase;