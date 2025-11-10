import { getToken, TokenHelperError } from '../utils/tokenHelper';
import axiosInstance from './axiosInstance';

// --------------------
// Interfaces
// --------------------
export interface ExamData {
  id: string;
  name: string;
  time: number;
  department: string;
  section: string;
  year: string;
}

export interface StudentData {
  registerNumber: string;
  userName: string;
  department: string;
  section: string;
  year: string;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  language?: string;
  executionTime?: number;
  memoryUsed?: number;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  data?: {
    submissionId: string;
    submittedAt: string;
    score?: number;
    totalTestCases?: number;
    passedTestCases?: number;
  };
}

export interface ExamDataResponse {
  success: boolean;
  data: {
    exam: ExamData;
    student: StudentData;
    assignedQuestion: string;
  };
  message?: string;
}

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
}

// --------------------
// Custom Error Classes
// --------------------
export class CodeServiceError extends Error {
  public code: string;
  public statusCode: number;
  public details?: string;
  public timestamp: Date;

  constructor(message: string, code: string, statusCode: number = 500, details?: string) {
    super(message);
    this.name = 'CodeServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
  }
}

export class CodeValidationError extends CodeServiceError {
  constructor(message: string = 'Code validation failed', details?: string) {
    super(message, 'CODE_VALIDATION_ERROR', 400, details);
  }
}

export class ExecutionError extends CodeServiceError {
  constructor(message: string = 'Code execution failed', details?: string) {
    super(message, 'EXECUTION_ERROR', 500, details);
  }
}

export class SubmissionError extends CodeServiceError {
  constructor(message: string = 'Code submission failed', details?: string) {
    super(message, 'SUBMISSION_ERROR', 500, details);
  }
}

export class CompilationError extends CodeServiceError {
  constructor(message: string = 'Code compilation failed', details?: string) {
    super(message, 'COMPILATION_ERROR', 400, details);
  }
}

export class TimeoutError extends CodeServiceError {
  constructor(message: string = 'Execution timeout', details?: string) {
    super(message, 'TIMEOUT_ERROR', 408, details);
  }
}

export class NoExamDataError extends CodeServiceError {
  constructor(message: string = 'No exam data found', details?: string) {
    super(message, 'NO_EXAM_DATA_ERROR', 404, details);
  }
}

export class AuthenticationError extends CodeServiceError {
  constructor(message: string = 'Authentication failed', details?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class NetworkError extends CodeServiceError {
  constructor(message: string = 'Network error occurred', details?: string) {
    super(message, 'NETWORK_ERROR', 503, details);
  }
}

export class ServerError extends CodeServiceError {
  constructor(message: string = 'Server error occurred', details?: string) {
    super(message, 'SERVER_ERROR', 500, details);
  }
}

// --------------------
// Validation Functions
// --------------------

/**
 * Supported programming languages
 */
export const SUPPORTED_LANGUAGES = [
  'python',
  'javascript',
  'java',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'go'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Validate code before execution/submission
 */
export const validateCode = (code: string, language: string): CodeValidationResult => {
  const errors: string[] = [];

  // Code validation
  if (!code || code.trim().length === 0) {
    errors.push('Code cannot be empty');
  } else if (code.trim().length < 5) {
    errors.push('Code must be at least 5 characters long');
  } else if (code.length > 100000) { // 100KB max code size
    errors.push('Code size must not exceed 100KB');
  }

  // Language validation
  if (!language || language.trim().length === 0) {
    errors.push('Programming language is required');
  } else if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    errors.push(`Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  // Additional language-specific validations
  if (language === 'java' && !code.includes('public class')) {
    errors.push('Java code must contain a public class');
  }

  if (language === 'c' && !code.includes('int main')) {
    errors.push('C code must contain a main function');
  }

  if (language === 'cpp' && !code.includes('int main')) {
    errors.push('C++ code must contain a main function');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate assigned question
 */
export const validateQuestion = (question: string): CodeValidationResult => {
  const errors: string[] = [];

  if (!question || question.trim().length === 0) {
    errors.push('Assigned question is required');
  } else if (question.trim().length < 10) {
    errors.push('Question seems too short');
  } else if (question.length > 10000) {
    errors.push('Question size is too large');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// --------------------
// Utility Functions
// --------------------

/**
 * Sanitize code by removing potentially dangerous patterns
 */
const sanitizeCode = (code: string, _language: string): string => {
  let sanitized = code.trim();
  
  // Basic sanitization - in production, you might want more sophisticated checks
  const dangerousPatterns = [
    /system\s*\(/gi,
    /exec\s*\(/gi,
    /eval\s*\(/gi,
    /fork\s*\(/gi,
    /process\./gi,
    /require\(['"]fs['"]\)/gi,
    /import.*fs/gi
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      throw new CodeValidationError(
        'Code contains potentially dangerous operations',
        'Security policy violation'
      );
    }
  }

  return sanitized;
};

/**
 * Detect code language from file extension or content
 */
export const detectLanguage = (code: string, filename?: string): string => {
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const extensionMap: Record<string, string> = {
      'py': 'python',
      'js': 'javascript',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'go': 'go'
    };
    
    if (ext && extensionMap[ext]) {
      return extensionMap[ext];
    }
  }

  // Fallback to content detection
  if (code.includes('public class') && code.includes('public static void main')) return 'java';
  if (code.includes('#include') && code.includes('int main')) return 'cpp';
  if (code.includes('using System') && code.includes('namespace')) return 'csharp';
  if (code.includes('def ') && code.includes('import ')) return 'python';
  if (code.includes('function') && code.includes('console.log')) return 'javascript';
  if (code.includes('<?php')) return 'php';
  
  return 'python'; // Default fallback
};

// --------------------
// Core Service Functions
// --------------------

/**
 * Fetch exam data with comprehensive error handling
 */
export const fetchExamData = async (): Promise<ExamDataResponse> => {
  try {
    // Step 1: Get authentication token
    let token: string | null;
    try {
      token = getToken();
    } catch (tokenError) {
      if (tokenError instanceof TokenHelperError) {
        throw new AuthenticationError(
          'Failed to retrieve authentication token',
          tokenError.details
        );
      }
      throw new AuthenticationError(
        'Authentication token retrieval failed',
        tokenError instanceof Error ? tokenError.message : 'Unknown token error'
      );
    }

    if (!token) {
      throw new AuthenticationError(
        'Authentication token not found',
        'Please login again to access this feature'
      );
    }

    // Step 2: Make API request
    const response = await axiosInstance.get('/code/getdata', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    // Step 3: Validate response structure
    if (response.status >= 200 && response.status < 300) {
      if (!response.data?.data?.exam || !response.data?.data?.student) {
        throw new NoExamDataError(
          'Incomplete exam data received',
          'Required exam or student data is missing'
        );
      }

      return {
        success: true,
        data: response.data.data,
        message: response.data?.message
      };
    } else {
      throw new NoExamDataError(
        response.data?.message || 'Failed to fetch exam data',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    // Handle different types of errors
    if (error instanceof CodeServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.statusText;

      let serviceError: CodeServiceError;

      switch (status) {
        case 401:
          serviceError = new AuthenticationError(
            serverMessage || 'Authentication failed',
            'Token may be expired or invalid'
          );
          break;
        case 403:
          serviceError = new AuthenticationError(
            serverMessage || 'Access forbidden',
            'You do not have permission to access exam data'
          );
          break;
        case 404:
          serviceError = new NoExamDataError(
            serverMessage || 'No active exam found',
            'There might be no exam assigned to you'
          );
          break;
        case 500:
          serviceError = new ServerError(
            serverMessage || 'Internal server error',
            'Please try again later'
          );
          break;
        case 503:
          serviceError = new ServerError(
            serverMessage || 'Service unavailable',
            'Code execution service is temporarily unavailable'
          );
          break;
        default:
          serviceError = new NoExamDataError(
            serverMessage || `Request failed with status ${status}`,
            error.response.data?.details
          );
      }

      throw serviceError;

    } else if (error.request) {
      throw new NetworkError(
        'No response received from server',
        'Network connection may be unavailable or server is down'
      );

    } else if (error.code === 'ECONNABORTED') {
      throw new TimeoutError(
        'Request timeout',
        'Server took too long to respond'
      );

    } else {
      throw new CodeServiceError(
        'Unexpected error occurred while fetching exam data',
        error.message
      );
    }
  }
};

/**
 * Execute code with comprehensive error handling
 */
export const executeCode = async (language: string, code: string): Promise<CodeExecutionResult> => {
  try {
    // Step 1: Validate inputs
    const codeValidation = validateCode(code, language);
    if (!codeValidation.isValid) {
      throw new CodeValidationError(
        'Code validation failed',
        codeValidation.errors.join('; ')
      );
    }

    // Step 2: Sanitize code
    const sanitizedCode = sanitizeCode(code, language);

    // Step 3: Get authentication token
    const token = getToken();
    if (!token) {
      throw new AuthenticationError('Authentication token not found');
    }

    // Step 4: Make API request
    const response = await axiosInstance.post('/execute/run', {
      language,
      code: sanitizedCode
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000 // 30 seconds timeout for execution
    });

    // Step 5: Handle response
    if (response.status >= 200 && response.status < 300) {
      return {
        success: response.data?.success !== false,
        output: response.data?.output,
        error: response.data?.error,
        language: response.data?.language,
        executionTime: response.data?.executionTime,
        memoryUsed: response.data?.memoryUsed
      };
    } else {
      throw new ExecutionError(
        response.data?.message || 'Code execution failed',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    if (error instanceof CodeServiceError) {
      throw error;
    }

    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message;

      if (status === 400) {
        throw new CompilationError(
          serverMessage || 'Compilation error',
          error.response.data?.details
        );
      } else if (status === 408) {
        throw new TimeoutError(
          serverMessage || 'Execution timeout',
          'Code took too long to execute'
        );
      } else if (status === 413) {
        throw new CodeValidationError(
          serverMessage || 'Code too large',
          'The submitted code exceeds size limits'
        );
      }

      throw new ExecutionError(
        serverMessage || `Execution failed with status ${status}`,
        error.response.data?.details
      );

    } else if (error.request) {
      throw new NetworkError('No response received from execution service');

    } else if (error.code === 'ECONNABORTED') {
      throw new TimeoutError('Execution request timeout');

    } else {
      throw new ExecutionError('Unexpected error during code execution', error.message);
    }
  }
};

/**
 * Submit code for evaluation with comprehensive error handling
 */
export const submitCode = async (
  language: string, 
  code: string, 
  assignedQuestion: string
): Promise<SubmissionResponse> => {
  try {
    // Step 1: Validate all inputs
    const codeValidation = validateCode(code, language);
    if (!codeValidation.isValid) {
      throw new CodeValidationError(
        'Code validation failed',
        codeValidation.errors.join('; ')
      );
    }

    const questionValidation = validateQuestion(assignedQuestion);
    if (!questionValidation.isValid) {
      throw new CodeValidationError(
        'Question validation failed',
        questionValidation.errors.join('; ')
      );
    }

    // Step 2: Sanitize code
    const sanitizedCode = sanitizeCode(code, language);

    // Step 3: Get authentication token
    const token = getToken();
    if (!token) {
      throw new AuthenticationError('Authentication token not found');
    }

    // Step 4: Make API request
    const response = await axiosInstance.post('/code/submit', {
      language,
      code: sanitizedCode,
      assignedQuestion
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 45000 // 45 seconds timeout for submission (might include test cases)
    });

    // Step 5: Handle response
    if (response.status >= 200 && response.status < 300) {
      const isSuccess = response.data?.success !== false;
      
      if (isSuccess) {
        return {
          success: true,
          message: response.data?.message || 'Code submitted successfully',
          data: response.data?.data
        };
      } else {
        throw new SubmissionError(
          response.data?.message || 'Code submission failed',
          'Server returned unsuccessful response'
        );
      }
    } else {
      throw new SubmissionError(
        response.data?.message || 'Code submission failed',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    if (error instanceof CodeServiceError) {
      throw error;
    }

    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message;

      if (status === 400) {
        throw new CompilationError(
          serverMessage || 'Submission failed due to compilation errors',
          error.response.data?.details
        );
      } else if (status === 408) {
        throw new TimeoutError(
          serverMessage || 'Submission timeout',
          'Code evaluation took too long'
        );
      }

      throw new SubmissionError(
        serverMessage || `Submission failed with status ${status}`,
        error.response.data?.details
      );

    } else if (error.request) {
      throw new NetworkError('No response received from submission service');

    } else if (error.code === 'ECONNABORTED') {
      throw new TimeoutError('Submission request timeout');

    } else {
      throw new SubmissionError('Unexpected error during code submission', error.message);
    }
  }
};

// --------------------
// Error Utility Functions
// --------------------

/**
 * Check if error is a CodeServiceError
 */
export const isCodeServiceError = (error: any): error is CodeServiceError => {
  return error instanceof CodeServiceError;
};

/**
 * Check if error is due to validation failure
 */
export const isValidationError = (error: any): boolean => {
  return error instanceof CodeValidationError;
};

/**
 * Check if error is due to authentication issues
 */
export const isAuthenticationError = (error: any): boolean => {
  return error instanceof AuthenticationError;
};

/**
 * Check if error is due to code execution issues
 */
export const isExecutionError = (error: any): boolean => {
  return error instanceof ExecutionError || error instanceof CompilationError;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (!isCodeServiceError(error)) {
    return 'An unexpected error occurred';
  }

  const errorMessages: Record<string, string> = {
    'CODE_VALIDATION_ERROR': 'Please check your code and try again.',
    'EXECUTION_ERROR': 'Code execution failed. Please try again.',
    'SUBMISSION_ERROR': 'Code submission failed. Please try again.',
    'COMPILATION_ERROR': 'Your code has compilation errors. Please fix them and try again.',
    'TIMEOUT_ERROR': 'Operation timed out. Please try with simpler code or try again later.',
    'NO_EXAM_DATA_ERROR': 'No active exam found. Please contact your instructor.',
    'AUTHENTICATION_ERROR': 'Please log in to continue.',
    'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
    'SERVER_ERROR': 'Server error occurred. Please try again later.'
  };

  return errorMessages[error.code] || error.message || 'A code service error occurred';
};

/**
 * Check if the error is recoverable (user can retry)
 */
export const isRecoverableError = (error: any): boolean => {
  if (!isCodeServiceError(error)) return false;
  
  const recoverableErrors = [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'SERVER_ERROR',
    'EXECUTION_ERROR'
  ];
  
  return recoverableErrors.includes(error.code);
};

// --------------------
// Service Object (maintaining original interface)
// --------------------

export const codeCompilerService = {
  fetchExamData,
  executeCode,
  submitCode,

  // Utility functions
  validateCode,
  validateQuestion,
  detectLanguage,
  isCodeServiceError,
  isValidationError,
  isAuthenticationError,
  isExecutionError,
  getUserFriendlyErrorMessage,
  isRecoverableError,

  // Constants
  SUPPORTED_LANGUAGES,

  // Error classes
  CodeServiceError,
  CodeValidationError,
  ExecutionError,
  SubmissionError,
  CompilationError,
  TimeoutError,
  NoExamDataError,
  AuthenticationError,
  NetworkError,
  ServerError
};

export default codeCompilerService;