import { getToken } from '../utils/tokenHelper';
import axiosInstance from './axiosInstance';

// --------------------
// Interfaces
// --------------------
export interface ExamDetails {
  name: string;
  time: number;
  department: string;
  section: string;
  year: string;
  file?: File | null;
}

export interface CreateExamResponse {
  success: boolean;
  message: string;
  examId?: string;
  data?: any;
  timestamp?: string;
}

export interface ExamValidationResult {
  isValid: boolean;
  errors: string[];
}

// --------------------
// Custom Error Classes
// --------------------
export class ExamServiceError extends Error {
  public code: string;
  public statusCode: number;
  public details?: string;
  public timestamp: Date;

  constructor(message: string, code: string, statusCode: number = 500, details?: string) {
    super(message);
    this.name = 'ExamServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
  }
}

export class ExamValidationError extends ExamServiceError {
  constructor(message: string = 'Exam validation failed', details?: string) {
    super(message, 'EXAM_VALIDATION_ERROR', 400, details);
  }
}

export class ExamCreationError extends ExamServiceError {
  constructor(message: string = 'Failed to create exam', details?: string) {
    super(message, 'EXAM_CREATION_ERROR', 500, details);
  }
}

export class FileUploadError extends ExamServiceError {
  constructor(message: string = 'File upload failed', details?: string) {
    super(message, 'FILE_UPLOAD_ERROR', 400, details);
  }
}

export class AuthenticationError extends ExamServiceError {
  constructor(message: string = 'Authentication failed', details?: string) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

export class NetworkError extends ExamServiceError {
  constructor(message: string = 'Network error occurred', details?: string) {
    super(message, 'NETWORK_ERROR', 503, details);
  }
}

export class ServerError extends ExamServiceError {
  constructor(message: string = 'Server error occurred', details?: string) {
    super(message, 'SERVER_ERROR', 500, details);
  }
}

export class ExamNotFoundError extends ExamServiceError {
  constructor(message: string = 'Exam not found', details?: string) {
    super(message, 'EXAM_NOT_FOUND', 404, details);
  }
}

// --------------------
// Validation Functions
// --------------------

/**
 * Validate exam details before submission
 */
export const validateExamDetails = (examDetails: ExamDetails): ExamValidationResult => {
  const errors: string[] = [];

  // Name validation
  if (!examDetails.name || examDetails.name.trim().length === 0) {
    errors.push('Exam name is required');
  } else if (examDetails.name.trim().length < 2) {
    errors.push('Exam name must be at least 2 characters long');
  } else if (examDetails.name.trim().length > 100) {
    errors.push('Exam name must not exceed 100 characters');
  }

  // Time validation
  if (!examDetails.time || examDetails.time <= 0) {
    errors.push('Exam time must be a positive number');
  } else if (examDetails.time > 480) {
    errors.push('Exam time cannot exceed 480 minutes (8 hours)');
  } else if (examDetails.time < 5) {
    errors.push('Exam time must be at least 5 minutes');
  }

  // Department validation
  if (!examDetails.department || examDetails.department.trim().length === 0) {
    errors.push('Department is required');
  }

  // Section validation
  if (!examDetails.section || examDetails.section.trim().length === 0) {
    errors.push('Section is required');
  }

  // Year validation
  if (!examDetails.year || examDetails.year.trim().length === 0) {
    errors.push('Year is required');
  } else {
    const validYears = ['1', '2', '3', '4', 'I', 'II', 'III', 'IV', '1st', '2nd', '3rd', '4th'];
    if (!validYears.includes(examDetails.year.trim())) {
      errors.push('Year must be a valid academic year');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate file before upload
 */
export const validateFile = (file: File): ExamValidationResult => {
  const errors: string[] = [];

  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  // File type validation
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Allowed types: PDF, PowerPoint, Word, Excel, Text');
  }

  // File size validation (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size must not exceed 10MB');
  }

  // File name validation
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name is required');
  } else if (file.name.length > 255) {
    errors.push('File name must not exceed 255 characters');
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
 * Sanitize exam details by trimming strings
 */
const sanitizeExamDetails = (examDetails: ExamDetails): ExamDetails => {
  return {
    ...examDetails,
    name: examDetails.name?.trim() || '',
    department: examDetails.department?.trim() || '',
    section: examDetails.section?.trim() || '',
    year: examDetails.year?.trim() || ''
  };
};

/**
 * Get file extension from file object
 */
const getFileExtension = (file: File): string => {
  return file.name.split('.').pop()?.toLowerCase() || '';
};

// --------------------
// Core Service Functions
// --------------------

/**
 * Create exam with comprehensive error handling and validation
 */
export const createExam = async (examDetails: ExamDetails, file: File): Promise<CreateExamResponse> => {
  try {
    // Step 1: Sanitize inputs
    const sanitizedDetails = sanitizeExamDetails(examDetails);
    
    // Step 2: Validate exam details
    const examValidation = validateExamDetails(sanitizedDetails);
    if (!examValidation.isValid) {
      throw new ExamValidationError(
        'Exam details validation failed',
        examValidation.errors.join('; ')
      );
    }

    // Step 3: Validate file
    const fileValidation = validateFile(file);
    if (!fileValidation.isValid) {
      throw new FileUploadError(
        'File validation failed',
        fileValidation.errors.join('; ')
      );
    }

    // Step 4: Get authentication token
    let token: string | null;
    try {
      token = getToken();
    } catch (tokenError) {
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

    // Step 5: Prepare form data
    const formData = new FormData();
    formData.append('name', sanitizedDetails.name);
    formData.append('time', sanitizedDetails.time.toString());
    formData.append('department', sanitizedDetails.department);
    formData.append('section', sanitizedDetails.section);
    formData.append('year', sanitizedDetails.year);
    formData.append('file', file);
    formData.append('fileExtension', getFileExtension(file));
    formData.append('fileSize', file.size.toString());

    // Step 6: Make API request
    const response = await axiosInstance.post('/exam/create', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });

    // Step 7: Handle response - FIXED: Check for success based on status code and response structure
    if (response.status >= 200 && response.status < 300) {
      // If response has success field, use it, otherwise assume success based on status code
      const isSuccess = response.data?.success !== false;
      
      if (isSuccess) {
        return {
          success: true,
          message: response.data?.message || 'Exam created successfully',
          examId: response.data?.examId,
          data: response.data?.data,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new ExamCreationError(
          response.data?.message || 'Failed to create exam',
          'Server returned unsuccessful response'
        );
      }
    } else {
      throw new ExamCreationError(
        response.data?.message || 'Failed to create exam',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    // Handle different types of errors
    if (error instanceof ExamServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.statusText;

      let serviceError: ExamServiceError;

      switch (status) {
        case 400:
          serviceError = new ExamValidationError(
            serverMessage || 'Bad request',
            error.response.data?.details
          );
          break;
        case 401:
          serviceError = new AuthenticationError(
            serverMessage || 'Authentication failed',
            'Token may be expired or invalid'
          );
          break;
        case 403:
          serviceError = new AuthenticationError(
            serverMessage || 'Access forbidden',
            'You do not have permission to create exams'
          );
          break;
        case 413:
          serviceError = new FileUploadError(
            serverMessage || 'File too large',
            'The uploaded file exceeds the server size limit'
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
            'Server is temporarily unavailable'
          );
          break;
        default:
          serviceError = new ExamCreationError(
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

    } else {
      throw new ExamCreationError(
        'Unexpected error occurred',
        error.message
      );
    }
  }
};

/**
 * Get all exams with error handling
 */
export const getAllExams = async (): Promise<any> => {
  try {
    const token = getToken();
    if (!token) {
      throw new AuthenticationError('Authentication token not found');
    }

    const response = await axiosInstance.get('/exam/all', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    return response.data;

  } catch (error: any) {
    if (error instanceof ExamServiceError) {
      throw error;
    }
    
    if (error.response) {
      throw new ServerError(
        error.response.data?.message || 'Failed to fetch exams',
        `Status: ${error.response.status}`
      );
    }
    
    throw new NetworkError('Failed to fetch exams due to network issue');
  }
};

/**
 * Get exam by ID with error handling
 */
export const getExamById = async (examId: string): Promise<any> => {
  try {
    if (!examId) {
      throw new ExamValidationError('Exam ID is required');
    }

    const token = getToken();
    if (!token) {
      throw new AuthenticationError('Authentication token not found');
    }

    const response = await axiosInstance.get(`/exam/${examId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    return response.data;

  } catch (error: any) {
    if (error instanceof ExamServiceError) {
      throw error;
    }
    
    if (error.response?.status === 404) {
      throw new ExamNotFoundError('Exam not found');
    }
    
    throw new ServerError('Failed to fetch exam details');
  }
};

/**
 * Delete exam by ID with error handling
 */
export const deleteExam = async (examId: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!examId) {
      throw new ExamValidationError('Exam ID is required for deletion');
    }

    const token = getToken();
    if (!token) {
      throw new AuthenticationError('Authentication token not found');
    }

    const response = await axiosInstance.delete(`/exam/${examId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    return {
      success: true,
      message: response.data?.message || 'Exam deleted successfully'
    };

  } catch (error: any) {
    if (error instanceof ExamServiceError) {
      throw error;
    }
    
    if (error.response?.status === 404) {
      throw new ExamNotFoundError('Exam not found');
    }
    
    throw new ServerError('Failed to delete exam');
  }
};

/**
 * Update exam with error handling
 */
export const updateExam = async (examId: string, examDetails: Partial<ExamDetails>, file?: File): Promise<CreateExamResponse> => {
  try {
    if (!examId) {
      throw new ExamValidationError('Exam ID is required for update');
    }

    const token = getToken();
    if (!token) {
      throw new AuthenticationError('Authentication token not found');
    }

    const formData = new FormData();
    
    if (examDetails.name) formData.append('name', examDetails.name);
    if (examDetails.time) formData.append('time', examDetails.time.toString());
    if (examDetails.department) formData.append('department', examDetails.department);
    if (examDetails.section) formData.append('section', examDetails.section);
    if (examDetails.year) formData.append('year', examDetails.year);
    if (file) formData.append('file', file);

    const response = await axiosInstance.put(`/exam/${examId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000
    });

    if (response.status >= 200 && response.status < 300) {
      const isSuccess = response.data?.success !== false;
      
      if (isSuccess) {
        return {
          success: true,
          message: response.data?.message || 'Exam updated successfully',
          examId: response.data?.examId,
          data: response.data?.data,
          timestamp: new Date().toISOString()
        };
      } else {
        throw new ExamCreationError(
          response.data?.message || 'Failed to update exam',
          'Server returned unsuccessful response'
        );
      }
    } else {
      throw new ExamCreationError(
        response.data?.message || 'Failed to update exam',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    if (error instanceof ExamServiceError) {
      throw error;
    }

    if (error.response?.status === 404) {
      throw new ExamNotFoundError('Exam not found');
    }

    throw new ServerError('Failed to update exam');
  }
};

// --------------------
// Error Utility Functions
// --------------------

/**
 * Check if error is an ExamServiceError
 */
export const isExamServiceError = (error: any): error is ExamServiceError => {
  return error instanceof ExamServiceError;
};

/**
 * Check if error is due to validation failure
 */
export const isValidationError = (error: any): boolean => {
  return error instanceof ExamValidationError || error instanceof FileUploadError;
};

/**
 * Check if error is due to authentication issues
 */
export const isAuthenticationError = (error: any): boolean => {
  return error instanceof AuthenticationError;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (!isExamServiceError(error)) {
    return 'An unexpected error occurred';
  }

  const errorMessages: Record<string, string> = {
    'EXAM_VALIDATION_ERROR': 'Please check your exam details and try again.',
    'FILE_UPLOAD_ERROR': 'There was a problem with your file. Please check the file type and size.',
    'AUTHENTICATION_ERROR': 'Please log in to continue.',
    'EXAM_CREATION_ERROR': 'Failed to create exam. Please try again.',
    'EXAM_NOT_FOUND': 'The requested exam was not found.',
    'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
    'SERVER_ERROR': 'Server error occurred. Please try again later.'
  };

  return errorMessages[error.code] || error.message || 'An exam service error occurred';
};

// --------------------
// Export all utilities
// --------------------
export default {
  createExam,
  getAllExams,
  getExamById,
  deleteExam,
  updateExam,
  validateExamDetails,
  validateFile,
  isExamServiceError,
  isValidationError,
  isAuthenticationError,
  getUserFriendlyErrorMessage,
  
  // Error classes
  ExamServiceError,
  ExamValidationError,
  ExamCreationError,
  FileUploadError,
  AuthenticationError,
  NetworkError,
  ServerError,
  ExamNotFoundError
};