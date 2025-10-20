import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import fs from "fs";
import path from "path";

// --------------------
// Logging Configuration
// --------------------
const LOG_DIR = path.join(__dirname, '../logs');
const JWT_LOG_FILE = path.join(LOG_DIR, 'jwt.log');
const JWT_ERROR_LOG_FILE = path.join(LOG_DIR, 'jwt-error.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// --------------------
// Logging Functions
// --------------------
const logToFile = (message: string, level: string = 'INFO', details?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [JWT] [${level}] ${message}`;
  
  const logDetails = {
    ...details,
    // Never log actual tokens
    token: details?.token ? '***' : undefined
  };

  const fullLogEntry = `${logMessage} ${Object.keys(logDetails).length > 0 ? JSON.stringify(logDetails) : ''}\n`;
  
  try {
    fs.appendFileSync(JWT_LOG_FILE, fullLogEntry);
  } catch (error) {
    // Fallback to console if file writing fails
    console.error('Failed to write to JWT log file:', error);
  }
};

const logErrorToFile = (message: string, error?: any, details?: any) => {
  const timestamp = new Date().toISOString();
  let errorMessage = `[${timestamp}] [JWT] [ERROR] ${message}`;
  
  const errorDetails = {
    ...details,
    errorMessage: error?.message,
    errorStack: error?.stack,
    // Never log actual tokens
    token: details?.token ? '***' : undefined
  };

  const fullLogEntry = `${errorMessage} ${JSON.stringify(errorDetails)}\n`;
  
  try {
    fs.appendFileSync(JWT_ERROR_LOG_FILE, fullLogEntry);
  } catch (writeError) {
    console.error('Failed to write to JWT error log file:', writeError);
  }
};

// --------------------
// Interfaces and Types
// --------------------
export interface JwtPayload {
  userId: string;
  userType: "student" | "staff";
  registerNumber?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

// --------------------
// Custom Error Classes
// --------------------
export class TokenValidationError extends Error {
  public code: string;
  public statusCode: number;
  public details?: string;

  constructor(message: string, code: string, statusCode: number = 401, details?: string) {
    super(message);
    this.name = 'TokenValidationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class TokenExpiredError extends TokenValidationError {
  constructor(message: string = 'Token has expired', details?: string) {
    super(message, 'TOKEN_EXPIRED', 401, details);
  }
}

export class TokenInvalidError extends TokenValidationError {
  constructor(message: string = 'Invalid token', details?: string) {
    super(message, 'TOKEN_INVALID', 401, details);
  }
}

export class TokenMissingError extends TokenValidationError {
  constructor(message: string = 'No token provided', details?: string) {
    super(message, 'TOKEN_MISSING', 401, details);
  }
}

// --------------------
// Configuration
// --------------------
const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  const errorMessage = "JWT_SECRET is not defined in environment variables";
  logErrorToFile(errorMessage);
  throw new Error(errorMessage);
}

// Convert token expiry to number of seconds (always returns number)
const getTokenExpiryInSeconds = (): number => {
  const expiry = process.env.JWT_EXPIRY || '24h';
  
  // Convert common time formats to seconds
  if (expiry.endsWith('d')) {
    return parseInt(expiry) * 24 * 60 * 60; // days to seconds
  } else if (expiry.endsWith('h')) {
    return parseInt(expiry) * 60 * 60; // hours to seconds
  } else if (expiry.endsWith('m')) {
    return parseInt(expiry) * 60; // minutes to seconds
  } else if (expiry.endsWith('s')) {
    return parseInt(expiry); // already seconds
  } else if (!isNaN(Number(expiry))) {
    return Number(expiry); // plain number as seconds
  } else {
    // Default to 24 hours in seconds if format is unknown
    return 24 * 60 * 60;
  }
};

const TOKEN_EXPIRY_SECONDS = getTokenExpiryInSeconds();

// Log configuration on startup
logToFile('JWT Middleware initialized', 'INFO', {
  tokenExpirySeconds: TOKEN_EXPIRY_SECONDS,
  logFiles: {
    main: JWT_LOG_FILE,
    error: JWT_ERROR_LOG_FILE
  }
});

// --------------------
// Utility Functions
// --------------------
const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

const validateTokenStructure = (token: string): boolean => {
  // Basic JWT structure validation (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3;
};

// --------------------
// Token Validation Function
// --------------------
export const validateToken = (token: string): TokenValidationResult => {
  try {
    // Check token structure
    if (!validateTokenStructure(token)) {
      logToFile('Token structure validation failed', 'WARN', {
        tokenLength: token.length,
        reason: 'JWT must have three parts separated by dots'
      });
      
      return {
        isValid: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: 'Token has invalid structure',
          details: 'JWT must have three parts separated by dots'
        }
      };
    }

    // Verify token signature and decode
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Validate payload structure
    if (!decoded.userId || !decoded.userType) {
      logToFile('Token payload validation failed', 'WARN', {
        hasUserId: !!decoded.userId,
        hasUserType: !!decoded.userType,
        reason: 'Payload must contain userId and userType'
      });
      
      return {
        isValid: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Token payload is missing required fields',
          details: 'Payload must contain userId and userType'
        }
      };
    }

    // Validate userType
    if (!['student', 'staff'].includes(decoded.userType)) {
      logToFile('Invalid user type in token', 'WARN', {
        userId: decoded.userId,
        userType: decoded.userType,
        reason: 'userType must be student or staff'
      });
      
      return {
        isValid: false,
        error: {
          code: 'INVALID_USER_TYPE',
          message: 'Invalid user type in token',
          details: `userType must be 'student' or 'staff', received: ${decoded.userType}`
        }
      };
    }

    // Validate identifier based on userType
    if (decoded.userType === 'student' && !decoded.registerNumber) {
      logToFile('Student token missing register number', 'WARN', {
        userId: decoded.userId,
        userType: decoded.userType,
        reason: 'Student tokens must include registerNumber'
      });
      
      return {
        isValid: false,
        error: {
          code: 'MISSING_REGISTER_NUMBER',
          message: 'Student token missing register number',
          details: 'Student tokens must include registerNumber'
        }
      };
    }

    if (decoded.userType === 'staff' && !decoded.email) {
      logToFile('Staff token missing email', 'WARN', {
        userId: decoded.userId,
        userType: decoded.userType,
        reason: 'Staff tokens must include email'
      });
      
      return {
        isValid: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Staff token missing email',
          details: 'Staff tokens must include email'
        }
      };
    }

    logToFile('Token validation successful', 'INFO', {
      userId: decoded.userId,
      userType: decoded.userType,
      issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : undefined,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : undefined
    });

    return {
      isValid: true,
      payload: decoded
    };

  } catch (error: any) {
    let errorCode = 'VERIFICATION_FAILED';
    let errorMessage = 'Token verification failed';
    let errorDetails = error.message;

    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token has expired';
      errorDetails = `Token expired at ${error.expiredAt}`;
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'INVALID_SIGNATURE';
      errorMessage = 'Invalid token signature';
    } else if (error.name === 'NotBeforeError') {
      errorCode = 'TOKEN_NOT_ACTIVE';
      errorMessage = 'Token is not yet active';
      errorDetails = `Token becomes active at ${error.date}`;
    }

    logErrorToFile(errorMessage, error, {
      errorCode,
      errorDetails,
      tokenLength: token.length
    });

    return {
      isValid: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails
      }
    };
  }
};

// --------------------
// Token Generation Function
// --------------------
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  try {
    // Use number for expiresIn (always seconds)
    const options: SignOptions = {
      expiresIn: TOKEN_EXPIRY_SECONDS, // Now guaranteed to be a number
      issuer: 'exam-system',
      subject: payload.userId
    };

    const token = jwt.sign(payload, JWT_SECRET, options);

    logToFile('Token generated successfully', 'INFO', {
      userId: payload.userId,
      userType: payload.userType,
      expiresIn: `${TOKEN_EXPIRY_SECONDS} seconds`
    });

    return token;
  } catch (error: any) {
    logErrorToFile('Token generation failed', error, {
      userId: payload.userId
    });
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

// --------------------
// Token Generation with Custom Expiry
// --------------------
export const generateTokenWithCustomExpiry = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>, 
  expiresInSeconds: number
): string => {
  try {
    const options: SignOptions = {
      expiresIn: expiresInSeconds,
      issuer: 'exam-system',
      subject: payload.userId
    };

    const token = jwt.sign(payload, JWT_SECRET, options);

    logToFile('Token generated successfully with custom expiry', 'INFO', {
      userId: payload.userId,
      userType: payload.userType,
      expiresIn: `${expiresInSeconds} seconds`
    });

    return token;
  } catch (error: any) {
    logErrorToFile('Token generation with custom expiry failed', error, {
      userId: payload.userId
    });
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

// --------------------
// Main Middleware Function
// --------------------
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // Extract token from header
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      logToFile('No token provided in request', 'WARN', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      throw new TokenMissingError(
        'Authentication token is required',
        'Include Authorization header with Bearer token'
      );
    }

    // Validate token
    const validationResult = validateToken(token);

    if (!validationResult.isValid || !validationResult.payload) {
      throw new TokenInvalidError(
        validationResult.error?.message || 'Invalid token',
        validationResult.error?.details
      );
    }

    // Attach user data to request
    req.user = validationResult.payload;

    logToFile('Token verified successfully', 'INFO', {
      userId: req.user.userId,
      userType: req.user.userType,
      path: req.path,
      method: req.method
    });

    next();

  } catch (error: any) {
    // Handle custom token errors
    if (error instanceof TokenValidationError) {
      logToFile('Token validation failed', 'WARN', {
        errorCode: error.code,
        errorMessage: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: {
          code: error.code,
          details: error.details,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Handle unexpected errors
    logErrorToFile('Unexpected error in token verification', error, {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: {
        code: 'AUTH_SERVER_ERROR',
        details: 'An unexpected error occurred while verifying token',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// --------------------
// Optional Token Middleware (for optional authentication)
// --------------------
export const optionalToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    logToFile('No token provided for optional authentication, continuing', 'INFO', {
      path: req.path,
      method: req.method
    });
    return next(); // Continue without user data
  }

  // Try to validate token, but don't fail if invalid
  const validationResult = validateToken(token);
  
  if (validationResult.isValid && validationResult.payload) {
    req.user = validationResult.payload;
    logToFile('Optional token verified', 'INFO', {
      userId: req.user.userId,
      userType: req.user.userType
    });
  } else {
    logToFile('Optional token validation failed, continuing without user data', 'WARN', {
      errorCode: validationResult.error?.code,
      path: req.path,
      method: req.method
    });
  }

  next();
};

// --------------------
// Role-based Authorization Middleware
// --------------------
export const requireRole = (allowedRoles: Array<'student' | 'staff'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      logToFile('Role check failed - no user data', 'WARN', {
        path: req.path,
        method: req.method,
        requiredRoles: allowedRoles
      });

      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: {
          code: 'AUTH_REQUIRED',
          details: 'User authentication is required for this endpoint',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      logToFile('Insufficient permissions', 'WARN', {
        userId: req.user.userId,
        userType: req.user.userType,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          details: `Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.userType}`,
          timestamp: new Date().toISOString()
        }
      });
    }

    logToFile('Role authorization successful', 'INFO', {
      userId: req.user.userId,
      userType: req.user.userType,
      requiredRoles: allowedRoles
    });

    next();
  };
};

// --------------------
// Token Refresh Middleware
// --------------------
export const refreshToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // This would typically check for a refresh token and issue a new access token
  // Implementation depends on your refresh token strategy
  logToFile('Token refresh endpoint called', 'INFO', {
    userId: req.user?.userId
  });

  // Placeholder implementation
  res.status(501).json({
    success: false,
    message: 'Token refresh not implemented',
    error: {
      code: 'NOT_IMPLEMENTED',
      details: 'Token refresh functionality is not yet implemented',
      timestamp: new Date().toISOString()
    }
  });
};

// --------------------
// Token Decode Function (without verification)
// --------------------
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    logToFile('Token decoded successfully', 'INFO', {
      userId: decoded?.userId,
      userType: decoded?.userType
    });
    return decoded;
  } catch (error) {
    logErrorToFile('Token decoding failed', error);
    return null;
  }
};

// --------------------
// Token Expiry Check Function
// --------------------
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (!decoded || !decoded.exp) {
      logToFile('Token expiry check - no expiration found', 'WARN');
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp < currentTime;
    
    logToFile('Token expiry check completed', 'INFO', {
      isExpired,
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      currentTime: new Date(currentTime * 1000).toISOString()
    });
    
    return isExpired;
  } catch (error) {
    logErrorToFile('Token expiry check failed', error);
    return true;
  }
};

// --------------------
// Log File Cleanup Function (optional)
// --------------------
export const cleanupOldLogs = (maxAgeDays: number = 30): void => {
  try {
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    [JWT_LOG_FILE, JWT_ERROR_LOG_FILE].forEach(logFile => {
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.writeFileSync(logFile, ''); // Clear the file
          logToFile('Cleared old log file', 'INFO', { file: logFile, maxAgeDays });
        }
      }
    });
  } catch (error) {
    logErrorToFile('Log cleanup failed', error);
  }
};

// --------------------
// Export all utilities
// --------------------
export default {
  verifyToken,
  optionalToken,
  requireRole,
  refreshToken,
  generateToken,
  generateTokenWithCustomExpiry,
  validateToken,
  decodeToken,
  isTokenExpired,
  cleanupOldLogs,
  TokenValidationError,
  TokenExpiredError,
  TokenInvalidError,
  TokenMissingError
};