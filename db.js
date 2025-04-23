const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  if (!db) {
    try {
      await client.connect();
      console.log('Connected to MongoDB Database');
      db = client.db('Secure');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }
  return db;
}

module.exports = connectToDatabase;