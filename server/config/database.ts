import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI!;

if (!MONGO_URI) throw new Error('MONGO_URI environment variable is not set');

// ---------------------------------------------------------------------------
// Mongoose connection — single pool shared across the process
//
// Sizing for 300+ concurrent users:
//   - Each request may need 1 DB operation at a time
//   - With PM2 cluster (4 workers) each worker handles ~75 concurrent users
//   - maxPoolSize 100 per worker gives plenty of headroom
// ---------------------------------------------------------------------------
export const connectMongoose = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return; // already connected

  await mongoose.connect(MONGO_URI, {
    // Pool sizing — tune per worker count
    maxPoolSize:               100,
    minPoolSize:               10,
    // Timeouts
    connectTimeoutMS:          10_000,
    socketTimeoutMS:           45_000,
    serverSelectionTimeoutMS:  10_000,
    heartbeatFrequencyMS:      10_000,
    // Reliability
    retryWrites: true,
    retryReads:  true,
    // Write concern — majority ensures durability on replica sets
    writeConcern: { w: 'majority', j: true },
    // Read preference — nearest for replica sets
    readPreference: 'primaryPreferred',
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
