import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { connectMongoose } from "./config/database";
import { requestQueue } from "./middleware/requestQueue";

// Import routes
import authRoutes from "./routes/authRoutes";
import examRoutes from "./routes/examRoutes";
import tableRoutes from "./routes/tableRoutes";
import codeRoutes from "./routes/codeRoutes";
import codeExecutionRoutes from "./routes/codeExecutionRoutes";

// --------------------
// Logging Configuration
// --------------------
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Logging functions
const logToFile = (message: string, level: string = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

const logErrorToFile = (message: string, error?: any) => {
  const timestamp = new Date().toISOString();
  let errorMessage = `[${timestamp}] [ERROR] ${message}`;
  
  if (error) {
    errorMessage += `\nError Details: ${error.message}\nStack: ${error.stack}\n`;
  }
  errorMessage += '\n';
  
  try {
    fs.appendFileSync(ERROR_LOG_FILE, errorMessage);
  } catch (writeError) {
    console.error('Failed to write to error log file:', writeError);
  }
};

// --------------------
// Environment Variables Validation
// --------------------
const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  const errorMessage = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
  console.error('❌', errorMessage);
  logErrorToFile(errorMessage);
  throw new Error(errorMessage);
}

// --------------------
// Express app setup
// --------------------
const app = express();

// Security Headers
app.use((req: Request, res: Response, next: NextFunction) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// CORS Configuration - Updated for WebSocket origins
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With", 
    "Accept", 
    "Origin",
    "x-exam-id"
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests manually without using app.options('*')
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-exam-id');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).send();
  } else {
    next();
  }
});

// Logging middleware - Only file logging for requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const logMessage = `${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`;
  logToFile(logMessage, 'REQUEST');
  next();
});

// Body parsing middleware with limits
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

// Static files
app.use(express.static("public"));

// Request queue middleware
app.use(requestQueue);

// Simple rate limiting middleware
const rateLimitMap = new Map();

// app.use((req: Request, res: Response, next: NextFunction) => {
//   const ip = req.ip || req.connection.remoteAddress;
//   const now = Date.now();
//   const windowMs = 15 * 60 * 1000; // 15 minutes
//   const maxRequests = 100;

//   if (!ip) return next();

//   const requestData = rateLimitMap.get(ip) || { count: 0, startTime: now };
  
//   if (now - requestData.startTime > windowMs) {
//     // Reset counter if window has passed
//     requestData.count = 1;
//     requestData.startTime = now;
//   } else {
//     requestData.count++;
//   }

//   rateLimitMap.set(ip, requestData);

//   if (requestData.count > maxRequests) {
//     logToFile(`Rate limit exceeded for IP: ${ip}`, 'WARN');
//     return res.status(429).json({
//       success: false,
//       message: 'Too many requests from this IP, please try again later.'
//     });
//   }

//   next();
// });

// Special rate limiting for auth endpoints
app.use("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;

  if (!ip) return next();

  const key = `auth-${ip}`;
  const requestData = rateLimitMap.get(key) || { count: 0, startTime: now };
  
  if (now - requestData.startTime > windowMs) {
    requestData.count = 1;
    requestData.startTime = now;
  } else {
    requestData.count++;
  }

  rateLimitMap.set(key, requestData);

  if (requestData.count > maxRequests) {
    logToFile(`Auth rate limit exceeded for IP: ${ip}`, 'WARN');
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP, please try again later.'
    });
  }

  next();
});

// --------------------
// Routes
// --------------------
app.use("/api/auth", authRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/table", tableRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/execute", codeExecutionRoutes);

// --------------------
// Health Check and Status Endpoints
// --------------------
app.get("/health", (req: Request, res: Response) => {
  logToFile('Health check endpoint called', 'INFO');
  res.status(200).json({
    success: true,
    message: "Server is running!",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/status", (req: Request, res: Response) => {
  logToFile('Status endpoint called', 'INFO');
  res.status(200).json({
    success: true,
    data: {
      server: "Online",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
    }
  });
});

// --------------------
// Error Handling Middleware
// --------------------

// 404 Handler
app.use((req: Request, res: Response) => {
  logToFile(`404 - Route not found: ${req.method} ${req.path}`, 'WARN');
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    error: {
      code: 'ROUTE_NOT_FOUND',
      details: 'The requested endpoint does not exist'
    }
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  };
  
  // Log critical errors to console and file
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    console.error('🚨 Server Error:', err.message);
  }
  
  logErrorToFile('Global Error Handler', errorDetails);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((error: any) => error.message);
    logErrorToFile('Mongoose Validation Error', { errors, ...errorDetails });
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      error: {
        code: 'VALIDATION_ERROR',
        details: errors
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    logErrorToFile('Mongoose Duplicate Key Error', { field, ...errorDetails });
    return res.status(400).json({
      success: false,
      message: `Duplicate field value: ${field}`,
      error: {
        code: 'DUPLICATE_KEY',
        details: `The ${field} already exists`
      }
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    logErrorToFile('Mongoose Cast Error', errorDetails);
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: {
        code: 'INVALID_ID',
        details: 'The provided ID is not valid'
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    logErrorToFile('JWT Error', errorDetails);
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: {
        code: 'INVALID_TOKEN',
        details: 'The authentication token is invalid'
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    logErrorToFile('JWT Token Expired', errorDetails);
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: {
        code: 'TOKEN_EXPIRED',
        details: 'The authentication token has expired'
      }
    });
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    logErrorToFile('CORS Error', errorDetails);
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      error: {
        code: 'CORS_ERROR',
        details: 'Request not allowed from this origin'
      }
    });
  }

  // Default error
  const message = err.message || 'Internal Server Error';

  logErrorToFile(`Unhandled Error - Status: ${statusCode}`, errorDetails);

  res.status(statusCode).json({
    success: false,
    message: NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal Server Error' 
      : message,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      details: NODE_ENV === 'production' && statusCode === 500 
        ? 'Something went wrong' 
        : err.message
    }
  });
});

// --------------------
// Graceful Shutdown Handler
// --------------------
let runningServer: any;

const gracefulShutdown = (signal: string) => {
  console.log(`\n📢 Received ${signal}. Starting graceful shutdown...`);
  logToFile(`Received ${signal}. Starting graceful shutdown...`, 'INFO');
  
  
  if (runningServer) {
    runningServer.close((err: any) => {
      if (err) {
        console.error('❌ Error during server close:', err);
        logErrorToFile('Error during server close', err);
        process.exit(1);
      }
      
      console.log('✅ HTTP server closed.');
      console.log('✅ Graceful shutdown completed.');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      logErrorToFile('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle different shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  logErrorToFile('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  logErrorToFile('Unhandled Rejection', { promise: String(promise), reason });
  process.exit(1);
});

// --------------------
// Start Server
// --------------------
const startServer = async () => {
  try {
    logToFile('Starting server...', 'INFO');
    logToFile(`Environment: ${NODE_ENV}`, 'INFO');
    
    await connectMongoose();
    return new Promise((resolve) => {
      const startedServer = app.listen(PORT, () => {
        // Console output (essential information)
        console.log('\n✨ ========================================');
        console.log(`   🌍 Server is live at http://localhost:${PORT}`);
        console.log(`   ⚡ Environment: ${NODE_ENV}`);
        console.log(`   🕐 Started at: ${new Date().toISOString()}`);
        console.log('   📊 Health check: http://localhost:' + PORT + '/health');
        console.log('✨ ========================================\n');

        // File logging (detailed information)
        const startupMessage = [
          '========================================',
          `Server is live at http://localhost:${PORT}`,
          `Environment: ${NODE_ENV}`,
          `Started at: ${new Date().toISOString()}`,
          `Health check: http://localhost:${PORT}/health`,
          '========================================'
        ].join('\n');
        
        logToFile(startupMessage, 'INFO');
        resolve(startedServer);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logErrorToFile('Failed to start server', error);
    process.exit(1);
  }
};

// Start the server
startServer().then(startedServer => {
  runningServer = startedServer;
});

export default app;