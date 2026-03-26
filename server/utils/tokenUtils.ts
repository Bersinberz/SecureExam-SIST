// utils/tokenUtils.ts
import jwt, { SignOptions } from "jsonwebtoken";
import ms from "ms";
import { Request } from "express";

// --------------------
// Configuration
// --------------------
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// --------------------
// Interfaces
// --------------------
export interface JwtPayload {
  userId: string;
  userType: string;
  email?: string;
  registerNumber?: number;
}

export interface MulterRequest extends Request {
  user?: any;
}

export interface TokenPayload {
  userId?: string;
  id?: string;
  _id?: string;
  userID?: string;
  sub?: string;
  userType?: string;
  email?: string;
  registerNumber?: number;
  exp?: number;
  iat?: number;
}

// --------------------
// Custom Error Classes
// --------------------
export class TokenUtilsError extends Error {
  public code: string;
  public statusCode: number;
  public details?: string;

  constructor(message: string, code: string, statusCode: number = 401, details?: string) {
    super(message);
    this.name = 'TokenUtilsError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class TokenExpiredError extends TokenUtilsError {
  constructor(message: string = 'Token has expired', details?: string) {
    super(message, 'TOKEN_EXPIRED', 401, details);
  }
}

export class TokenInvalidError extends TokenUtilsError {
  constructor(message: string = 'Invalid token', details?: string) {
    super(message, 'TOKEN_INVALID', 401, details);
  }
}

export class TokenMissingError extends TokenUtilsError {
  constructor(message: string = 'No token provided', details?: string) {
    super(message, 'TOKEN_MISSING', 401, details);
  }
}

export class TokenCreationError extends TokenUtilsError {
  constructor(message: string = 'Failed to create token', details?: string) {
    super(message, 'TOKEN_CREATION_ERROR', 500, details);
  }
}

// --------------------
// Utility Functions
// --------------------
const extractTokenFromHeader = (authHeader: string | undefined): string => {
  if (!authHeader) {
    throw new TokenMissingError(
      'Authorization header is missing',
      'Include Authorization header with Bearer token'
    );
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new TokenInvalidError(
      'Invalid authorization header format',
      'Authorization header must follow format: Bearer <token>'
    );
  }

  return parts[1];
};

const validateTokenStructure = (token: string): boolean => {
  const parts = token.split('.');
  return parts.length === 3;
};

const extractUserIdFromPayload = (decoded: TokenPayload): string => {
  // Try all possible field names for user ID
  if (decoded.userId) return decoded.userId;
  if (decoded.id) return decoded.id;
  if (decoded._id) return decoded._id;
  if (decoded.userID) return decoded.userID;
  if (decoded.sub) return decoded.sub;

  // Log available fields for debugging
  const availableFields = Object.keys(decoded).filter(key => 
    key !== 'exp' && key !== 'iat' && key !== 'iss' && key !== 'aud'
  );
  
  throw new TokenInvalidError(
    'User ID not found in token payload',
    `Available fields in token: ${availableFields.join(', ')}`
  );
};

// --------------------
// Core Token Functions
// --------------------

/**
 * Create JWT token with comprehensive error handling
 */
export const createToken = (payload: JwtPayload, expiresIn: string = "1h"): string => {
  try {
    // Validate input
    if (!payload.userId || !payload.userType) {
      throw new TokenCreationError(
        'Missing required payload fields',
        'Payload must contain userId and userType'
      );
    }

    // Validate userType
    if (!['student', 'staff'].includes(payload.userType)) {
      throw new TokenCreationError(
        'Invalid user type',
        `userType must be 'student' or 'staff', received: ${payload.userType}`
      );
    }

    // Validate identifier based on userType
    if (payload.userType === 'student' && !payload.registerNumber) {
      throw new TokenCreationError(
        'Student token missing register number',
        'Student tokens must include registerNumber'
      );
    }

    if (payload.userType === 'staff' && !payload.email) {
      throw new TokenCreationError(
        'Staff token missing email',
        'Staff tokens must include email'
      );
    }

    const expires = ms(expiresIn as ms.StringValue);
    if (!expires) {
      throw new TokenCreationError(
        'Invalid expiresIn format',
        `expiresIn must be a valid time string, received: ${expiresIn}`
      );
    }

    const options: SignOptions = { 
      expiresIn: Math.floor(expires / 1000),
      issuer: 'exam-system',
      subject: payload.userId
    };

    return jwt.sign(payload, JWT_SECRET, options);

  } catch (error: any) {
    if (error instanceof TokenUtilsError) {
      throw error;
    }
    
    throw new TokenCreationError(
      `Failed to create token: ${error.message}`,
      'An unexpected error occurred during token creation'
    );
  }
};

/**
 * Extract user ID from JWT token with comprehensive error handling
 */
export const getUserIdFromToken = (req: MulterRequest): string => {
  try {
    // Check if user is already attached to request (from middleware)
    if (req.user) {
      return extractUserIdFromPayload(req.user);
    }

    // Extract from authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!validateTokenStructure(token)) {
      throw new TokenInvalidError(
        'Token has invalid structure',
        'JWT must have three parts separated by dots'
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return extractUserIdFromPayload(decoded);

  } catch (error: any) {
    if (error instanceof TokenUtilsError) {
      throw error;
    }

    // Handle JWT verification errors
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError(
        'Token has expired',
        `Token expired at ${error.expiredAt}`
      );
    }

    if (error.name === 'JsonWebTokenError') {
      throw new TokenInvalidError(
        'Invalid token signature',
        error.message
      );
    }

    throw new TokenUtilsError(
      `Authentication failed: ${error.message}`,
      'AUTH_FAILED',
      401,
      'An unexpected error occurred during authentication'
    );
  }
};

/**
 * Extract user ID from token string
 */
export const getUserIdFromTokenString = (token: string): string => {
  try {
    if (!validateTokenStructure(token)) {
      throw new TokenInvalidError(
        'Token has invalid structure',
        'JWT must have three parts separated by dots'
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return extractUserIdFromPayload(decoded);

  } catch (error: any) {
    if (error instanceof TokenUtilsError) {
      throw error;
    }

    // Handle JWT verification errors
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError(
        'Token has expired',
        `Token expired at ${error.expiredAt}`
      );
    }

    if (error.name === 'JsonWebTokenError') {
      throw new TokenInvalidError(
        'Invalid token signature',
        error.message
      );
    }

    throw new TokenUtilsError(
      `Token verification failed: ${error.message}`,
      'TOKEN_VERIFICATION_FAILED',
      401,
      'An unexpected error occurred during token verification'
    );
  }
};

/**
 * Extract user type from token with comprehensive error handling
 */
export const getUserTypeFromToken = (req: MulterRequest): string => {
  try {
    // If we have req.user, check for userType there first
    if (req.user && req.user.userType) {
      return req.user.userType;
    }

    // Extract from authorization header
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!validateTokenStructure(token)) {
      throw new TokenInvalidError(
        'Token has invalid structure',
        'JWT must have three parts separated by dots'
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    if (!decoded.userType) {
      throw new TokenInvalidError(
        'User type not found in token',
        'Token payload must contain userType field'
      );
    }

    // Validate userType
    if (!['student', 'staff'].includes(decoded.userType)) {
      throw new TokenInvalidError(
        'Invalid user type in token',
        `userType must be 'student' or 'staff', received: ${decoded.userType}`
      );
    }

    return decoded.userType;

  } catch (error: any) {
    if (error instanceof TokenUtilsError) {
      throw error;
    }

    throw new TokenUtilsError(
      `Failed to extract user type: ${error.message}`,
      'USER_TYPE_EXTRACTION_FAILED',
      401,
      'An unexpected error occurred while extracting user type'
    );
  }
};

/**
 * Check if token is expired with comprehensive error handling
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    if (!validateTokenStructure(token)) {
      return true;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;

  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return true;
    }
    
    // Consider invalid tokens as expired for security
    return true;
  }
};

/**
 * Refresh token with comprehensive error handling
 */
export const refreshToken = (token: string, expiresIn: string = "1h"): string => {
  try {
    if (!validateTokenStructure(token)) {
      throw new TokenInvalidError(
        'Token has invalid structure',
        'JWT must have three parts separated by dots'
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Create new token with same payload but new expiry
    return createToken(decoded, expiresIn);

  } catch (error: any) {
    if (error instanceof TokenUtilsError) {
      throw error;
    }

    throw new TokenUtilsError(
      `Cannot refresh token: ${error.message}`,
      'TOKEN_REFRESH_FAILED',
      401,
      'An unexpected error occurred while refreshing token'
    );
  }
};

/**
 * Get token expiration time with comprehensive error handling
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    if (!validateTokenStructure(token)) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    
    return null;

  } catch (error: any) {
    return null;
  }
};

/**
 * Validate token and return decoded payload with comprehensive error handling
 */
export const validateToken = (token: string): TokenPayload => {
  try {
    if (!validateTokenStructure(token)) {
      throw new TokenInvalidError(
        'Token has invalid structure',
        'JWT must have three parts separated by dots'
      );
    }

    return jwt.verify(token, JWT_SECRET) as TokenPayload;

  } catch (error: any) {
    if (error instanceof TokenUtilsError) {
      throw error;
    }

    // Handle JWT verification errors
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredError(
        'Token has expired',
        `Token expired at ${error.expiredAt}`
      );
    }

    if (error.name === 'JsonWebTokenError') {
      throw new TokenInvalidError(
        'Invalid token signature',
        error.message
      );
    }

    throw new TokenUtilsError(
      `Token validation failed: ${error.message}`,
      'TOKEN_VALIDATION_FAILED',
      401,
      'An unexpected error occurred during token validation'
    );
  }
};

// --------------------
// Export all utilities
// --------------------
export default {
  createToken,
  getUserIdFromToken,
  getUserIdFromTokenString,
  getUserTypeFromToken,
  isTokenExpired,
  refreshToken,
  getTokenExpiration,
  validateToken,
  TokenUtilsError,
  TokenExpiredError,
  TokenInvalidError,
  TokenMissingError,
  TokenCreationError
};