// utils/tokenUtils.ts
import jwt, { SignOptions } from "jsonwebtoken";
import ms from "ms";
import { Request } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "fallbackSecret";

interface JwtPayload {
  userId: string;
  userType: string;
  email?: string;
  registerNumber?: number;
}

interface MulterRequest extends Request {
  user?: any;
}

interface TokenPayload {
  userId?: string;
  id?: string;
  _id?: string;
  userID?: string;
  sub?: string;
  userType?: string;
  email?: string;
  registerNumber?: number;
}

/**
 * Create JWT token
 */
export const createToken = (payload: JwtPayload, expiresIn: string = "1h"): string => {
  const expires = ms(expiresIn as ms.StringValue);
  const options: SignOptions = { expiresIn: (expires! / 1000) as number };
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
};

/**
 * Extract user ID from JWT token
 * Supports multiple token field names: userId, id, _id, userID, sub
 */
export const getUserIdFromToken = (req: MulterRequest): string => {
  try {
    // Check if user is already attached to request (from middleware)
    if (req.user) {
      // Try different possible field names for user ID
      if (req.user.userId) return req.user.userId;
      if (req.user.id) return req.user.id;
      if (req.user._id) return req.user._id;
      if (req.user.userID) return req.user.userID;
      if (req.user.sub) return req.user.sub;
    }

    // Fallback: extract from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error("No authorization token provided");
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Try all possible field names in token payload
    if (decoded.userId) return decoded.userId;
    if (decoded.id) return decoded.id;
    if (decoded._id) return decoded._id;
    if (decoded.userID) return decoded.userID;
    if (decoded.sub) return decoded.sub;

    // If no user ID found, log the available fields for debugging
    console.log('Token payload structure:', JSON.stringify(decoded, null, 2));
    throw new Error("User ID not found in token payload");

  } catch (error: any) {
    console.error('Token verification error:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};


export const getUserIdFromTokenString = (token: string): string => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    if (decoded.userId) return decoded.userId;
    if (decoded.id) return decoded.id;
    if (decoded._id) return decoded._id;
    if (decoded.userID) return decoded.userID;
    if (decoded.sub) return decoded.sub;

    throw new Error("User ID not found in token");
  } catch (error: any) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Extract user type from token
 */
export const getUserTypeFromToken = (req: MulterRequest): string => {
  try {
    const userId = getUserIdFromToken(req);
    
    // If we have req.user, check for userType there first
    if (req.user && req.user.userType) {
      return req.user.userType;
    }

    // Fallback: extract from authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      if (decoded.userType) {
        return decoded.userType;
      }
    }

    throw new Error("User type not found in token");
  } catch (error: any) {
    throw new Error(`Failed to extract user type: ${error.message}`);
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Refresh token by creating a new one with the same payload but extended expiry
 */
export const refreshToken = (token: string, expiresIn: string = "1h"): string => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return createToken(decoded, expiresIn);
  } catch (error: any) {
    throw new Error(`Cannot refresh token: ${error.message}`);
  }
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};