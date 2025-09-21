import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/Secure';

let dbInstance: Db | null = null;

export const connectToDatabase = async (): Promise<Db> => {
  if (dbInstance) return dbInstance;
  
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  dbInstance = client.db();
  return dbInstance;
};

export const connectMongoose = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB via Mongoose');
  } catch (err) {
    console.error('Mongoose connection error:', err);
    throw err;
  }
};