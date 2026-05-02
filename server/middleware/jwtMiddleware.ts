import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { isTokenBlocked } from "../utils/tokenBlocklist";

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
  throw new Error("JWT_SECRET is not defined in environment variables");
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
      return {
        isValid: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Staff token missing email',
          details: 'Staff tokens must include email'
        }
      };
    }

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
    return token;
  } catch (error: any) {
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
    return token;
  } catch (error: any) {
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

// --------------------
// Main Middleware Function
// --------------------
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Extract token from header
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      throw new TokenMissingError(
        'Authentication token is required',
        'Include Authorization header with Bearer token'
      );
    }

    // Reject logged-out tokens (async Redis check)
    if (await isTokenBlocked(token)) {
      throw new TokenInvalidError('Token has been revoked. Please log in again.');
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
    next();

  } catch (error: any) {
    // Handle custom token errors
    if (error instanceof TokenValidationError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: {
          code: error.code,
          details: error.details,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Handle unexpected errors
    res.status(500).json({
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
    return next(); // Continue without user data
  }

  // Try to validate token, but don't fail if invalid
  const validationResult = validateToken(token);
  
  if (validationResult.isValid && validationResult.payload) {
    req.user = validationResult.payload;
  }

  next();
};

// --------------------
// Role-based Authorization Middleware
// --------------------
export const requireRole = (allowedRoles: Array<'student' | 'staff'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
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

    next();
  };
};

// --------------------
// Token Refresh Middleware
// --------------------
export const refreshToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // This would typically check for a refresh token and issue a new access token
  // Implementation depends on your refresh token strategy

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
    return decoded;
  } catch (error) {
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
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// --------------------
// Log File Cleanup Function (removed since logs are removed)
// --------------------
export const cleanupOldLogs = (maxAgeDays: number = 30): void => {
  // Function kept for API compatibility but does nothing since logs are removed
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