/**
 * tokenHelper.ts
 * 
 * Helper functions for storing, retrieving, and removing JWT tokens
 * from browser localStorage with additional token utilities and complete error handling.
 */

/** Key used to store JWT token in localStorage */
const TOKEN_KEY = "jwtToken";

// --------------------
// Interfaces
// --------------------
export interface JwtPayload {
  userId: string;
  userType: string;
  email?: string;
  registerNumber?: number;
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
// Comprehensive Error Classes
// --------------------
export class TokenHelperError extends Error {
  public code: string;
  public statusCode: number;
  public details?: string;
  public timestamp: Date;

  constructor(message: string, code: string, statusCode: number = 401, details?: string) {
    super(message);
    this.name = 'TokenHelperError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
  }
}

export class TokenExpiredError extends TokenHelperError {
  constructor(message: string = 'Token has expired', details?: string) {
    super(message, 'TOKEN_EXPIRED', 401, details);
    this.name = 'TokenExpiredError';
  }
}

export class TokenInvalidError extends TokenHelperError {
  constructor(message: string = 'Invalid token', details?: string) {
    super(message, 'TOKEN_INVALID', 401, details);
    this.name = 'TokenInvalidError';
  }
}

export class TokenMissingError extends TokenHelperError {
  constructor(message: string = 'No token provided', details?: string) {
    super(message, 'TOKEN_MISSING', 401, details);
    this.name = 'TokenMissingError';
  }
}

export class TokenStorageError extends TokenHelperError {
  constructor(message: string = 'Token storage error', details?: string) {
    super(message, 'TOKEN_STORAGE_ERROR', 500, details);
    this.name = 'TokenStorageError';
  }
}

export class TokenDecodeError extends TokenHelperError {
  constructor(message: string = 'Failed to decode token', details?: string) {
    super(message, 'TOKEN_DECODE_ERROR', 400, details);
    this.name = 'TokenDecodeError';
  }
}

export class TokenStructureError extends TokenHelperError {
  constructor(message: string = 'Invalid token structure', details?: string) {
    super(message, 'TOKEN_STRUCTURE_ERROR', 400, details);
    this.name = 'TokenStructureError';
  }
}

export class TokenValidationError extends TokenHelperError {
  constructor(message: string = 'Token validation failed', details?: string) {
    super(message, 'TOKEN_VALIDATION_ERROR', 400, details);
    this.name = 'TokenValidationError';
  }
}

export class TokenSecurityError extends TokenHelperError {
  constructor(message: string = 'Token security violation', details?: string) {
    super(message, 'TOKEN_SECURITY_ERROR', 403, details);
    this.name = 'TokenSecurityError';
  }
}

export class LocalStorageError extends TokenHelperError {
  constructor(message: string = 'Local storage operation failed', details?: string) {
    super(message, 'LOCAL_STORAGE_ERROR', 500, details);
    this.name = 'LocalStorageError';
  }
}

export class BrowserCompatibilityError extends TokenHelperError {
  constructor(message: string = 'Browser compatibility issue', details?: string) {
    super(message, 'BROWSER_COMPATIBILITY_ERROR', 500, details);
    this.name = 'BrowserCompatibilityError';
  }
}

export class TokenPayloadError extends TokenHelperError {
  constructor(message: string = 'Invalid token payload', details?: string) {
    super(message, 'TOKEN_PAYLOAD_ERROR', 400, details);
    this.name = 'TokenPayloadError';
  }
}

export class UserIdExtractionError extends TokenHelperError {
  constructor(message: string = 'Failed to extract user ID', details?: string) {
    super(message, 'USER_ID_EXTRACTION_ERROR', 400, details);
    this.name = 'UserIdExtractionError';
  }
}

export class UserTypeExtractionError extends TokenHelperError {
  constructor(message: string = 'Failed to extract user type', details?: string) {
    super(message, 'USER_TYPE_EXTRACTION_ERROR', 400, details);
    this.name = 'UserTypeExtractionError';
  }
}

export class TokenExpirationError extends TokenHelperError {
  constructor(message: string = 'Failed to process token expiration', details?: string) {
    super(message, 'TOKEN_EXPIRATION_ERROR', 400, details);
    this.name = 'TokenExpirationError';
  }
}

// --------------------
// Utility Functions
// --------------------

/**
 * Check if localStorage is available in the current environment
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Safely access localStorage with error handling
 */
const safeLocalStorageAccess = <T>(operation: () => T): T => {
  if (!isLocalStorageAvailable()) {
    throw new BrowserCompatibilityError(
      'LocalStorage is not available in this environment',
      'Check if you are in a browser environment and localStorage is enabled'
    );
  }

  try {
    return operation();
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown localStorage error';
    
    if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('QUOTA_EXCEEDED_ERR')) {
      throw new LocalStorageError(
        'Local storage quota exceeded',
        'Clear some space in localStorage or use sessionStorage instead'
      );
    }
    
    if (errorMessage.includes('SecurityError')) {
      throw new TokenSecurityError(
        'Security violation accessing localStorage',
        'Check if the domain has proper permissions for localStorage'
      );
    }
    
    throw new LocalStorageError(
      `LocalStorage operation failed: ${errorMessage}`,
      'Unknown error during localStorage access'
    );
  }
};

/**
 * Validates JWT token structure
 */
const validateTokenStructure = (token: string): boolean => {
  if (typeof token !== 'string') {
    throw new TokenStructureError(
      'Token must be a string',
      `Received type: ${typeof token}`
    );
  }

  if (token.length === 0) {
    throw new TokenStructureError(
      'Token cannot be empty',
      'Token string has zero length'
    );
  }

  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new TokenStructureError(
      'JWT must have exactly 3 parts',
      `Found ${parts.length} parts instead of 3`
    );
  }

  // Check if all parts are non-empty
  if (parts.some(part => part.length === 0)) {
    throw new TokenStructureError(
      'All JWT parts must be non-empty',
      'One or more JWT parts are empty'
    );
  }

  return true;
};

/**
 * Extracts user ID from token payload with comprehensive error handling
 */
const extractUserIdFromPayload = (decoded: TokenPayload): string => {
  if (!decoded || typeof decoded !== 'object') {
    throw new UserIdExtractionError(
      'Invalid decoded token payload',
      'Payload must be a non-null object'
    );
  }

  // Try all possible field names for user ID
  const possibleIdFields = ['userId', 'id', '_id', 'userID', 'sub'];
  const foundIdField = possibleIdFields.find(field => 
    decoded[field as keyof TokenPayload] !== undefined &&
    decoded[field as keyof TokenPayload] !== null &&
    decoded[field as keyof TokenPayload] !== ''
  );

  if (foundIdField) {
    const userId = decoded[foundIdField as keyof TokenPayload];
    if (typeof userId === 'string' && userId.length > 0) {
      return userId;
    } else {
      throw new UserIdExtractionError(
        `User ID in field '${foundIdField}' is invalid`,
        `Expected non-empty string, got: ${typeof userId}`
      );
    }
  }

  // Log available fields for debugging
  const availableFields = Object.keys(decoded).filter(key => 
    key !== 'exp' && key !== 'iat' && key !== 'iss' && key !== 'aud'
  );
  
  throw new UserIdExtractionError(
    'User ID not found in token payload',
    `Searched fields: ${possibleIdFields.join(', ')}. Available fields: ${availableFields.join(', ')}`
  );
};

/**
 * Validates user type from token payload
 */
const validateUserType = (userType: any): string => {
  if (typeof userType !== 'string') {
    throw new UserTypeExtractionError(
      'User type must be a string',
      `Received type: ${typeof userType}`
    );
  }

  if (!['student', 'staff'].includes(userType)) {
    throw new UserTypeExtractionError(
      'Invalid user type',
      `userType must be 'student' or 'staff', received: '${userType}'`
    );
  }

  return userType;
};

// --------------------
// Storage Functions
// --------------------

/**
 * Stores the JWT token in localStorage.
 * @param token - JWT token string
 */
export const storeToken = (token: string): void => {
  try {
    if (!token) {
      throw new TokenMissingError('No token provided for storage');
    }

    validateTokenStructure(token);

    safeLocalStorageAccess(() => {
      localStorage.setItem(TOKEN_KEY, token);
    });
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    throw new TokenStorageError(
      'Failed to store token in localStorage',
      error instanceof Error ? error.message : 'Unknown storage error'
    );
  }
};

/**
 * Retrieves the JWT token from localStorage.
 * @returns The JWT token string or null if not found
 */
export const getToken = (): string | null => {
  try {
    return safeLocalStorageAccess(() => {
      return localStorage.getItem(TOKEN_KEY);
    });
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    throw new TokenStorageError(
      'Failed to retrieve token from localStorage',
      error instanceof Error ? error.message : 'Unknown retrieval error'
    );
  }
};

/**
 * Removes the JWT token from localStorage.
 */
export const removeToken = (): void => {
  try {
    safeLocalStorageAccess(() => {
      localStorage.removeItem(TOKEN_KEY);
    });
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    throw new TokenStorageError(
      'Failed to remove token from localStorage',
      error instanceof Error ? error.message : 'Unknown removal error'
    );
  }
};

/**
 * Checks if a token exists in localStorage.
 * @returns boolean indicating if token exists
 */
export const hasToken = (): boolean => {
  try {
    return safeLocalStorageAccess(() => {
      return localStorage.getItem(TOKEN_KEY) !== null;
    });
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    throw new TokenStorageError(
      'Failed to check token existence',
      error instanceof Error ? error.message : 'Unknown check error'
    );
  }
};

// --------------------
// Token Validation Utilities
// --------------------

/**
 * Decodes JWT token without verification (for client-side use)
 */
export const decodeToken = (token: string): TokenPayload => {
  try {
    validateTokenStructure(token);

    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if necessary
    const pad = base64.length % 4;
    const base64Padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    
    const jsonPayload = decodeURIComponent(
      atob(base64Padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decoded = JSON.parse(jsonPayload);
    
    if (typeof decoded !== 'object' || decoded === null) {
      throw new TokenDecodeError('Decoded token is not a valid object');
    }

    return decoded;
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      throw new TokenDecodeError(
        'Failed to parse token payload as JSON',
        error.message
      );
    }
    
    throw new TokenDecodeError(
      'Failed to decode token',
      error instanceof Error ? error.message : 'Unknown decoding error'
    );
  }
};

/**
 * Extracts user ID from stored token
 */
export const getUserIdFromStoredToken = (): string => {
  try {
    const token = getToken();
    if (!token) {
      throw new TokenMissingError('No token found in storage');
    }

    const decoded = decodeToken(token);
    return extractUserIdFromPayload(decoded);
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    throw new UserIdExtractionError(
      'Failed to extract user ID from stored token',
      error instanceof Error ? error.message : 'Unknown extraction error'
    );
  }
};

/**
 * Extracts user type from stored token
 */
export const getUserTypeFromStoredToken = (): string => {
  try {
    const token = getToken();
    if (!token) {
      throw new TokenMissingError('No token found in storage');
    }

    const decoded = decodeToken(token);
    
    if (!decoded.userType) {
      throw new UserTypeExtractionError('User type not found in token payload');
    }

    return validateUserType(decoded.userType);
  } catch (error) {
    if (error instanceof TokenHelperError) {
      throw error;
    }
    throw new UserTypeExtractionError(
      'Failed to extract user type from stored token',
      error instanceof Error ? error.message : 'Unknown extraction error'
    );
  }
};

/**
 * Checks if stored token is expired
 */
export const isStoredTokenExpired = (): boolean => {
  try {
    const token = getToken();
    if (!token) {
      return true;
    }

    const decoded = decodeToken(token);
    if (!decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    // Consider any error as expired for security
    return true;
  }
};

/**
 * Gets expiration time of stored token
 */
export const getStoredTokenExpiration = (): Date | null => {
  try {
    const token = getToken();
    if (!token) {
      return null;
    }

    const decoded = decodeToken(token);
    if (!decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Gets time remaining until token expiration in milliseconds
 */
export const getStoredTokenTimeRemaining = (): number => {
  try {
    const expiration = getStoredTokenExpiration();
    if (!expiration) {
      return 0;
    }

    const now = new Date();
    const timeRemaining = expiration.getTime() - now.getTime();
    return Math.max(0, timeRemaining);
  } catch (error) {
    return 0;
  }
};

/**
 * Validates stored token structure and basic properties
 */
export const validateStoredToken = (): boolean => {
  try {
    const token = getToken();
    if (!token) {
      return false;
    }

    validateTokenStructure(token);
    const decoded = decodeToken(token);

    // Check if we have required fields
    const hasUserId = !!(decoded.userId || decoded.id || decoded._id || decoded.userID || decoded.sub);
    const hasUserType = !!decoded.userType;

    if (!hasUserId || !hasUserType) {
      throw new TokenValidationError(
        'Token missing required fields',
        `hasUserId: ${hasUserId}, hasUserType: ${hasUserType}`
      );
    }

    // Validate user type format
    validateUserType(decoded.userType);

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Gets complete token information
 */
export const getTokenInfo = (): {
  exists: boolean;
  isValid: boolean;
  isExpired: boolean;
  userType?: string;
  userId?: string;
  expiration?: Date;
  timeRemaining?: number;
  error?: string;
} => {
  try {
    const exists = hasToken();
    
    if (!exists) {
      return { exists: false, isValid: false, isExpired: true };
    }

    const isValid = validateStoredToken();
    const isExpired = isStoredTokenExpired();

    let userType: string | undefined;
    let userId: string | undefined;
    let expiration: Date | undefined;
    let timeRemaining: number | undefined;

    if (isValid && !isExpired) {
      try {
        userType = getUserTypeFromStoredToken();
        userId = getUserIdFromStoredToken();
        expiration = getStoredTokenExpiration() || undefined;
        timeRemaining = getStoredTokenTimeRemaining();
      } catch (extractionError) {
        // Silently fail for optional fields, but mark as invalid
        return {
          exists: true,
          isValid: false,
          isExpired: true,
          error: extractionError instanceof Error ? extractionError.message : 'Extraction failed'
        };
      }
    }

    return {
      exists: true,
      isValid,
      isExpired,
      userType,
      userId,
      expiration,
      timeRemaining
    };
  } catch (error) {
    return {
      exists: false,
      isValid: false,
      isExpired: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Clears all authentication data (comprehensive cleanup)
 */
export const clearAuthData = (): void => {
  try {
    removeToken();
    
    // Clear any other related auth data that might be stored
    const authKeys = [
      TOKEN_KEY,
      'userData',
      'authData',
      'sessionData',
      'userInfo',
      'authToken',
      'refreshToken',
      'userSession'
    ];
    
    authKeys.forEach(key => {
      try {
        safeLocalStorageAccess(() => {
          localStorage.removeItem(key);
        });
      } catch {
        // Ignore errors for individual key removal
      }
    });
  } catch (error) {
    throw new TokenStorageError(
      'Failed to clear authentication data',
      error instanceof Error ? error.message : 'Unknown cleanup error'
    );
  }
};

// --------------------
// Error Utility Functions
// --------------------

/**
 * Check if error is a TokenHelperError
 */
export const isTokenHelperError = (error: any): error is TokenHelperError => {
  return error instanceof TokenHelperError;
};

/**
 * Check if error is due to token expiration
 */
export const isTokenExpiredError = (error: any): boolean => {
  return error instanceof TokenExpiredError;
};

/**
 * Check if error is due to invalid token
 */
export const isTokenInvalidError = (error: any): boolean => {
  return error instanceof TokenInvalidError || 
         error instanceof TokenStructureError ||
         error instanceof TokenDecodeError;
};

/**
 * Check if error is due to storage issues
 */
export const isStorageError = (error: any): boolean => {
  return error instanceof TokenStorageError ||
         error instanceof LocalStorageError ||
         error instanceof BrowserCompatibilityError;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (!isTokenHelperError(error)) {
    return 'An unexpected error occurred';
  }

  const errorMessages: Record<string, string> = {
    'TOKEN_EXPIRED': 'Your session has expired. Please log in again.',
    'TOKEN_INVALID': 'Invalid authentication token.',
    'TOKEN_MISSING': 'No authentication token found.',
    'TOKEN_STORAGE_ERROR': 'Failed to save authentication data.',
    'LOCAL_STORAGE_ERROR': 'Browser storage error. Please check your browser settings.',
    'BROWSER_COMPATIBILITY_ERROR': 'Your browser does not support required features.',
    'TOKEN_STRUCTURE_ERROR': 'Invalid token format.',
    'TOKEN_DECODE_ERROR': 'Failed to read authentication data.',
    'USER_ID_EXTRACTION_ERROR': 'Unable to read user information.',
    'USER_TYPE_EXTRACTION_ERROR': 'Unable to determine user type.',
    'TOKEN_SECURITY_ERROR': 'Security violation detected.'
  };

  return errorMessages[error.code] || error.message || 'An authentication error occurred';
};

// --------------------
// Export all utilities
// --------------------
export default {
  // Storage functions
  storeToken,
  getToken,
  removeToken,
  hasToken,
  clearAuthData,
  
  // Token utilities
  decodeToken,
  getUserIdFromStoredToken,
  getUserTypeFromStoredToken,
  isStoredTokenExpired,
  getStoredTokenExpiration,
  getStoredTokenTimeRemaining,
  validateStoredToken,
  getTokenInfo,
  
  // Error utilities
  isTokenHelperError,
  isTokenExpiredError,
  isTokenInvalidError,
  isStorageError,
  getUserFriendlyErrorMessage,
  
  // All Error Classes
  TokenHelperError,
  TokenExpiredError,
  TokenInvalidError,
  TokenMissingError,
  TokenStorageError,
  TokenDecodeError,
  TokenStructureError,
  TokenValidationError,
  TokenSecurityError,
  LocalStorageError,
  BrowserCompatibilityError,
  TokenPayloadError,
  UserIdExtractionError,
  UserTypeExtractionError,
  TokenExpirationError
};