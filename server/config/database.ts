import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';

// --------------------
// Environment Variables Validation
// --------------------
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("Missing MONGO_URI environment variable");
}

// Validate MongoDB connection string format
if (!MONGO_URI.startsWith('mongodb://') && !MONGO_URI.startsWith('mongodb+srv://')) {
  throw new Error("Invalid MongoDB connection string format");
}

// --------------------
// Database Configuration
// --------------------
let dbInstance: Db | null = null;
let mongoClient: MongoClient | null = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RETRY_DELAY = 5000; // 5 seconds

// MongoDB client options
const mongoOptions: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// --------------------
// Custom Error Classes
// --------------------
export class DatabaseConnectionError extends Error {
  public originalError?: any;
  public connectionString: string;

  constructor(message: string, connectionString: string, originalError?: any) {
    super(message);
    this.name = 'DatabaseConnectionError';
    this.connectionString = connectionString;
    this.originalError = originalError;
  }
}

export class DatabaseQueryError extends Error {
  public operation: string;
  public originalError?: any;

  constructor(message: string, operation: string, originalError?: any) {
    super(message);
    this.name = 'DatabaseQueryError';
    this.operation = operation;
    this.originalError = originalError;
  }
}

export class DatabaseValidationError extends Error {
  public field?: string;
  public value?: any;

  constructor(message: string, field?: string, value?: any) {
    super(message);
    this.name = 'DatabaseValidationError';
    this.field = field;
    this.value = value;
  }
}

// --------------------
// Utility Functions
// --------------------
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const getConnectionInfo = (uri: string): { database: string; host: string } => {
  try {
    const url = new URL(uri);
    const database = url.pathname.replace('/', '') || 'admin';
    const host = url.hostname;
    return { database, host };
  } catch {
    return { database: 'unknown', host: 'unknown' };
  }
};

const logDatabaseEvent = (level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [DATABASE] [${level}] ${message}`;
  
  if (level === 'ERROR') {
    console.error(logMessage, details || '');
  } else if (level === 'WARN') {
    console.warn(logMessage, details || '');
  } else {
    console.log(logMessage, details || '');
  }
};

// --------------------
// MongoDB Native Driver Connection
// --------------------
export const connectToDatabase = async (): Promise<Db> => {
  // Return existing connection if available and healthy
  if (dbInstance && isConnected) {
    try {
      // Ping the database to check if connection is still alive
      await dbInstance.admin().ping();
      return dbInstance;
    } catch (error) {
      logDatabaseEvent('WARN', 'Existing database connection is stale, reconnecting...');
      isConnected = false;
      dbInstance = null;
      mongoClient = null;
    }
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    throw new DatabaseConnectionError(
      `Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) exceeded`,
      MONGO_URI
    );
  }

  connectionAttempts++;

  try {
    logDatabaseEvent('INFO', `Attempting MongoDB connection (attempt ${connectionAttempts})`, {
      host: getConnectionInfo(MONGO_URI).host,
      database: getConnectionInfo(MONGO_URI).database
    });

    const client = new MongoClient(MONGO_URI, mongoOptions);
    
    // Set connection timeout
    const connectionPromise = client.connect();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );

    await Promise.race([connectionPromise, timeoutPromise]);
    
    mongoClient = client;
    dbInstance = client.db();
    isConnected = true;
    connectionAttempts = 0; // Reset counter on successful connection

    // Verify connection with ping
    await dbInstance.admin().ping();
    
    logDatabaseEvent('INFO', 'Successfully connected to MongoDB', {
      host: getConnectionInfo(MONGO_URI).host,
      database: getConnectionInfo(MONGO_URI).database,
      poolSize: mongoOptions.maxPoolSize
    });

    // Set up event listeners for connection monitoring
    client.on('serverHeartbeatFailed', (event) => {
      logDatabaseEvent('WARN', 'MongoDB server heartbeat failed', { 
        connectionId: event.connectionId,
        failure: event.failure
      });
    });

    client.on('connectionPoolReady', () => {
      logDatabaseEvent('INFO', 'MongoDB connection pool ready');
    });

    client.on('connectionPoolClosed', () => {
      logDatabaseEvent('WARN', 'MongoDB connection pool closed');
      isConnected = false;
    });

    return dbInstance;

  } catch (error: any) {
    const connectionInfo = getConnectionInfo(MONGO_URI);
    
    logDatabaseEvent('ERROR', `MongoDB connection failed (attempt ${connectionAttempts})`, {
      error: error.message,
      host: connectionInfo.host,
      database: connectionInfo.database,
      stack: error.stack
    });

    // Retry logic with exponential backoff
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const retryDelay = RETRY_DELAY * connectionAttempts;
      logDatabaseEvent('INFO', `Retrying connection in ${retryDelay}ms...`);
      await delay(retryDelay);
      return connectToDatabase();
    }

    throw new DatabaseConnectionError(
      `Failed to connect to MongoDB after ${MAX_CONNECTION_ATTEMPTS} attempts: ${error.message}`,
      MONGO_URI,
      error
    );
  }
};

// --------------------
// Mongoose Connection
// --------------------
export const connectMongoose = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    logDatabaseEvent('INFO', 'Mongoose already connected');
    return;
  }

  try {
    // Configure Mongoose connection options
    const mongooseOptions: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    };

    logDatabaseEvent('INFO', 'Connecting to MongoDB with Mongoose', {
      host: getConnectionInfo(MONGO_URI).host,
      database: getConnectionInfo(MONGO_URI).database
    });

    await mongoose.connect(MONGO_URI, mongooseOptions);
    
    logDatabaseEvent('INFO', '✅ Mongoose connected to MongoDB', {
      host: getConnectionInfo(MONGO_URI).host,
      database: getConnectionInfo(MONGO_URI).database,
      readyState: mongoose.connection.readyState
    });

    // Set up Mongoose event listeners
    mongoose.connection.on('connected', () => {
      logDatabaseEvent('INFO', 'Mongoose connection established');
    });

    mongoose.connection.on('error', (error) => {
      logDatabaseEvent('ERROR', 'Mongoose connection error', {
        error: error.message,
        stack: error.stack
      });
    });

    mongoose.connection.on('disconnected', () => {
      logDatabaseEvent('WARN', 'Mongoose connection disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logDatabaseEvent('INFO', 'Mongoose connection reestablished');
    });

    mongoose.connection.on('reconnectFailed', () => {
      logDatabaseEvent('ERROR', 'Mongoose reconnection failed');
    });

  } catch (error: any) {
    const connectionInfo = getConnectionInfo(MONGO_URI);
    
    logDatabaseEvent('ERROR', 'Mongoose connection failed', {
      error: error.message,
      host: connectionInfo.host,
      database: connectionInfo.database,
      stack: error.stack
    });

    throw new DatabaseConnectionError(
      `Mongoose failed to connect to MongoDB: ${error.message}`,
      MONGO_URI,
      error
    );
  }
};

// --------------------
// Database Health Check
// --------------------
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    mongodb: boolean;
    mongoose: boolean;
    responseTime: number;
    database: string;
    host: string;
  };
}> => {
  const startTime = Date.now();
  const connectionInfo = getConnectionInfo(MONGO_URI);

  try {
    // Check MongoDB native driver connection
    const db = await connectToDatabase();
    await db.admin().ping();

    // Check Mongoose connection
    const mongooseReady = mongoose.connection.readyState === 1;

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      details: {
        mongodb: true,
        mongoose: mongooseReady,
        responseTime,
        database: connectionInfo.database,
        host: connectionInfo.host,
      },
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    logDatabaseEvent('ERROR', 'Database health check failed', {
      error: error.message,
      responseTime,
      host: connectionInfo.host
    });

    return {
      status: 'unhealthy',
      details: {
        mongodb: false,
        mongoose: false,
        responseTime,
        database: connectionInfo.database,
        host: connectionInfo.host,
      },
    };
  }
};

// --------------------
// Database Cleanup and Disconnection
// --------------------
export const disconnectDatabase = async (): Promise<void> => {
  try {
    const disconnectPromises: Promise<void>[] = [];

    // Disconnect MongoDB native client
    if (mongoClient) {
      disconnectPromises.push(mongoClient.close());
      logDatabaseEvent('INFO', 'MongoDB native client disconnected');
    }

    // Disconnect Mongoose
    if (mongoose.connection.readyState !== 0) {
      disconnectPromises.push(mongoose.disconnect());
      logDatabaseEvent('INFO', 'Mongoose disconnected');
    }

    await Promise.allSettled(disconnectPromises);
    
    dbInstance = null;
    mongoClient = null;
    isConnected = false;
    
    logDatabaseEvent('INFO', 'All database connections closed');

  } catch (error: any) {
    logDatabaseEvent('ERROR', 'Error during database disconnection', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// --------------------
// Connection State Getters
// --------------------
export const getConnectionState = () => ({
  isConnected,
  connectionAttempts,
  mongooseReadyState: mongoose.connection.readyState,
  mongoClientConnected: !!mongoClient && isConnected,
});

export const getDatabaseInstance = (): Db => {
  if (!dbInstance || !isConnected) {
    throw new DatabaseConnectionError(
      'Database not connected. Call connectToDatabase() first.',
      MONGO_URI
    );
  }
  return dbInstance;
};

// --------------------
// Graceful Shutdown Handler
// --------------------
export const setupDatabaseShutdownHandlers = (): void => {
  const shutdown = async (signal: string) => {
    logDatabaseEvent('INFO', `Received ${signal}, closing database connections...`);
    try {
      await disconnectDatabase();
      logDatabaseEvent('INFO', 'Database connections closed gracefully');
    } catch (error) {
      logDatabaseEvent('ERROR', 'Error closing database connections', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Initialize shutdown handlers
setupDatabaseShutdownHandlers();

export default {
  connectToDatabase,
  connectMongoose,
  disconnectDatabase,
  checkDatabaseHealth,
  getConnectionState,
  getDatabaseInstance,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseValidationError,
};