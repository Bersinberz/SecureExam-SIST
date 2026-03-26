import { storeToken } from "../utils/tokenHelper";
import axios from "./axiosInstance";

export interface LoginData {
  identifier: string;
  password: string;
  userType: "student" | "staff" | "";
}

export interface LoginResponse {
  token: string;
  userType?: "student" | "staff";
  registerNumber?: string;
  message?: string;
  exams?: any[];
  assignedQuestion?: string;
  success?: boolean;
}

// Custom error class for login-specific errors
export class LoginError extends Error {
  public statusCode: number;
  public userMessage: string;
  public originalError?: any;

  constructor(message: string, statusCode: number = 500, userMessage?: string, originalError?: any) {
    super(message);
    this.name = 'LoginError';
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
    this.originalError = originalError;
  }
}

// Error types
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  TOKEN_ERROR: 'TOKEN_ERROR'
} as const;

// Error messages mapping
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK_ERROR]: {
    userMessage: 'Network connection failed. Please check your internet connection and try again.',
    logMessage: 'Network error occurred during login'
  },
  [ERROR_TYPES.SERVER_ERROR]: {
    userMessage: 'Server is currently unavailable. Please try again later.',
    logMessage: 'Server error occurred during login'
  },
  [ERROR_TYPES.VALIDATION_ERROR]: {
    userMessage: 'Invalid input provided. Please check your credentials and try again.',
    logMessage: 'Validation error occurred during login'
  },
  [ERROR_TYPES.AUTHENTICATION_ERROR]: {
    userMessage: 'Authentication failed. Please check your credentials.',
    logMessage: 'Authentication error occurred during login'
  },
  [ERROR_TYPES.AUTHORIZATION_ERROR]: {
    userMessage: 'You are not authorized to access this resource.',
    logMessage: 'Authorization error occurred during login'
  },
  [ERROR_TYPES.TIMEOUT_ERROR]: {
    userMessage: 'Request timed out. Please try again.',
    logMessage: 'Timeout error occurred during login'
  },
  [ERROR_TYPES.INVALID_CREDENTIALS]: {
    userMessage: 'Invalid username or password. Please try again.',
    logMessage: 'Invalid credentials provided'
  },
  [ERROR_TYPES.ACCOUNT_LOCKED]: {
    userMessage: 'Your account has been locked. Please contact administrator.',
    logMessage: 'Account is locked'
  },
  [ERROR_TYPES.ACCOUNT_INACTIVE]: {
    userMessage: 'Your account is inactive. Please contact administrator.',
    logMessage: 'Account is inactive'
  },
  [ERROR_TYPES.TOKEN_ERROR]: {
    userMessage: 'Authentication token error. Please try logging in again.',
    logMessage: 'Token error occurred'
  },
  [ERROR_TYPES.UNKNOWN_ERROR]: {
    userMessage: 'An unexpected error occurred. Please try again.',
    logMessage: 'Unknown error occurred during login'
  }
};

export const login = async (data: LoginData): Promise<LoginResponse> => {
  // Input validation
  if (!data.identifier?.trim() || !data.password?.trim() || !data.userType) {
    throw new LoginError(
      'Missing required fields',
      400,
      'Please provide all required fields',
      { identifier: data.identifier, userType: data.userType }
    );
  }

  if (data.identifier.trim().length < 3) {
    throw new LoginError(
      'Invalid identifier',
      400,
      'Username/Register Number must be at least 3 characters long',
      { identifier: data.identifier }
    );
  }

  if (data.password.length < 4) {
    throw new LoginError(
      'Invalid password',
      400,
      'Password must be at least 4 characters long',
      { passwordLength: data.password.length }
    );
  }

  try {
    const response = await axios.post("/auth/login", data, {
      timeout: 15000, // 15 seconds timeout
      validateStatus: (status) => status < 500 // Don't throw for 4xx errors
    });

    // Handle different HTTP status codes
    if (response.status === 200) {
      const responseData = response.data;

      // Check if the request was successful
      if (!responseData.success) {
        const errorMessage = responseData.message || 'Login failed';
        
        // Handle specific error cases from server
        if (errorMessage.toLowerCase().includes('invalid') || 
            errorMessage.toLowerCase().includes('credentials')) {
          throw new LoginError(
            errorMessage,
            401,
            ERROR_MESSAGES[ERROR_TYPES.INVALID_CREDENTIALS].userMessage,
            responseData
          );
        } else if (errorMessage.toLowerCase().includes('locked')) {
          throw new LoginError(
            errorMessage,
            423,
            ERROR_MESSAGES[ERROR_TYPES.ACCOUNT_LOCKED].userMessage,
            responseData
          );
        } else if (errorMessage.toLowerCase().includes('inactive')) {
          throw new LoginError(
            errorMessage,
            403,
            ERROR_MESSAGES[ERROR_TYPES.ACCOUNT_INACTIVE].userMessage,
            responseData
          );
        } else {
          throw new LoginError(
            errorMessage,
            400,
            errorMessage,
            responseData
          );
        }
      }

      // Extract token and user data
      const token = responseData.data?.token || responseData.token;
      
      if (!token) {
        console.warn("Token not found in response:", responseData);
        throw new LoginError(
          'No authentication token received',
          500,
          ERROR_MESSAGES[ERROR_TYPES.TOKEN_ERROR].userMessage,
          responseData
        );
      }

      // Store token
      storeToken(token);

      // Return complete login response
      return {
        token,
        userType: responseData.data?.userType || responseData.userType,
        registerNumber: responseData.data?.registerNumber || responseData.registerNumber,
        message: responseData.message || 'Login successful',
        exams: responseData.data?.exams || responseData.exams,
        assignedQuestion: responseData.data?.assignedQuestion || responseData.assignedQuestion,
        success: true
      };

    } else if (response.status === 401) {
      throw new LoginError(
        'Unauthorized - Invalid credentials',
        401,
        ERROR_MESSAGES[ERROR_TYPES.INVALID_CREDENTIALS].userMessage,
        response.data
      );
    } else if (response.status === 403) {
      throw new LoginError(
        'Forbidden - Account restricted',
        403,
        ERROR_MESSAGES[ERROR_TYPES.AUTHORIZATION_ERROR].userMessage,
        response.data
      );
    } else if (response.status === 404) {
      throw new LoginError(
        'User not found',
        404,
        'Account not found. Please check your credentials.',
        response.data
      );
    } else if (response.status === 429) {
      throw new LoginError(
        'Too many requests',
        429,
        'Too many login attempts. Please try again later.',
        response.data
      );
    } else if (response.status >= 500) {
      throw new LoginError(
        'Server error',
        response.status,
        ERROR_MESSAGES[ERROR_TYPES.SERVER_ERROR].userMessage,
        response.data
      );
    } else {
      throw new LoginError(
        `Unexpected status code: ${response.status}`,
        response.status,
        ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR].userMessage,
        response.data
      );
    }

  } catch (error: any) {
    console.error("Login error details:", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data
    });

    // Handle different types of errors
    if (error instanceof LoginError) {
      throw error; // Re-throw our custom errors
    }

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new LoginError(
        'Request timeout',
        408,
        ERROR_MESSAGES[ERROR_TYPES.TIMEOUT_ERROR].userMessage,
        error
      );
    }

    if (error.code === 'NETWORK_ERROR' || !error.response) {
      throw new LoginError(
        'Network error',
        0,
        ERROR_MESSAGES[ERROR_TYPES.NETWORK_ERROR].userMessage,
        error
      );
    }

    if (error.response?.status === 401) {
      throw new LoginError(
        'Authentication failed',
        401,
        ERROR_MESSAGES[ERROR_TYPES.AUTHENTICATION_ERROR].userMessage,
        error.response.data
      );
    }

    if (error.response?.status === 422) {
      throw new LoginError(
        'Validation error',
        422,
        ERROR_MESSAGES[ERROR_TYPES.VALIDATION_ERROR].userMessage,
        error.response.data
      );
    }

    if (error.response?.status >= 500) {
      throw new LoginError(
        'Server error',
        error.response.status,
        ERROR_MESSAGES[ERROR_TYPES.SERVER_ERROR].userMessage,
        error.response.data
      );
    }

    // Fallback for unknown errors
    throw new LoginError(
      error.message || 'Unknown login error',
      error.response?.status || 500,
      ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR].userMessage,
      error
    );
  }
};

// Utility function to check if error is a LoginError
export const isLoginError = (error: any): error is LoginError => {
  return error instanceof LoginError && error.name === 'LoginError';
};

// Utility function to handle login errors in components
export const handleLoginError = (error: any): { message: string; type: string } => {
  if (isLoginError(error)) {
    return {
      message: error.userMessage,
      type: getErrorType(error.statusCode)
    };
  }

  if (error.response?.status === 401) {
    return {
      message: ERROR_MESSAGES[ERROR_TYPES.INVALID_CREDENTIALS].userMessage,
      type: 'invalid_credentials'
    };
  }

  if (error.response?.status === 429) {
    return {
      message: 'Too many login attempts. Please try again later.',
      type: 'rate_limit'
    };
  }

  if (!error.response) {
    return {
      message: ERROR_MESSAGES[ERROR_TYPES.NETWORK_ERROR].userMessage,
      type: 'network_error'
    };
  }

  // Fallback for other errors
  const statusCode = error.response?.status || 500;
  return {
    message: getErrorMessageForStatusCode(statusCode),
    type: getErrorType(statusCode)
  };
};

// Helper function to get error message based on status code
const getErrorMessageForStatusCode = (statusCode: number): string => {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return ERROR_MESSAGES[ERROR_TYPES.INVALID_CREDENTIALS].userMessage;
    case 403:
      return ERROR_MESSAGES[ERROR_TYPES.AUTHORIZATION_ERROR].userMessage;
    case 404:
      return 'Account not found. Please check your credentials.';
    case 408:
      return ERROR_MESSAGES[ERROR_TYPES.TIMEOUT_ERROR].userMessage;
    case 422:
      return ERROR_MESSAGES[ERROR_TYPES.VALIDATION_ERROR].userMessage;
    case 423:
      return ERROR_MESSAGES[ERROR_TYPES.ACCOUNT_LOCKED].userMessage;
    case 429:
      return 'Too many login attempts. Please try again later.';
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES[ERROR_TYPES.SERVER_ERROR].userMessage;
    default:
      return ERROR_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR].userMessage;
  }
};

// Helper function to get error type based on status code
const getErrorType = (statusCode: number): string => {
  switch (statusCode) {
    case 401:
      return 'invalid_credentials';
    case 403:
    case 423:
      return 'account_restricted';
    case 404:
      return 'account_not_found';
    case 429:
      return 'rate_limit';
    case 408:
      return 'timeout';
    case 400:
    case 422:
      return 'validation_error';
    case 500:
    case 502:
    case 503:
      return 'server_error';
    case 0:
      return 'network_error';
    default:
      return 'unknown_error';
  }
};

// Export error types for use in components
export type ErrorType = 
  | 'invalid_credentials'
  | 'account_restricted'
  | 'account_not_found'
  | 'rate_limit'
  | 'timeout'
  | 'validation_error'
  | 'server_error'
  | 'network_error'
  | 'unknown_error';