import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI!;

if (!MONGO_URI) throw new Error('MONGO_URI environment variable is not set');

// ---------------------------------------------------------------------------
// Mongoose connection — single pool shared across the process
// ---------------------------------------------------------------------------
export const connectMongoose = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return; // already connected

  await mongoose.connect(MONGO_URI, {
    // Pool: enough headroom for concurrent exam traffic
    maxPoolSize:               50,
    minPoolSize:               5,
    // Timeouts
    connectTimeoutMS:          10_000,
    socketTimeoutMS:           45_000,
    serverSelectionTimeoutMS:  10_000,
    heartbeatFrequencyMS:      10_000,
    // Reliability
    retryWrites: true,
    retryReads:  true,
  });

  console.log('[db] mongoose connected');

  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected',  () => console.log('[db] reconnected'));
  mongoose.connection.on('error',        (e) => console.error('[db] error', e.message));
};

export const disconnectMongoose = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[db] disconnected gracefully');
  }
};

export const isDbConnected = (): boolean =>
  mongoose.connection.readyState === 1;
