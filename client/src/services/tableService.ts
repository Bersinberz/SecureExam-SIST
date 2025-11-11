import axiosInstance from './axiosInstance';
import { getToken, TokenHelperError, } from '../utils/tokenHelper';

// --------------------
// Interfaces
// --------------------
export interface StudentFilter {
  department: string;
  section: string;
  year: string;
  examId?: string;
}

export interface Student {
  _id: string;
  userName: string;
  registerNumber: string;
  department: string;
  section: string;
  year: string;
  hasSubmitted?: boolean;
  submission?: {
    submittedAt: string;
    language: string;
    status: 'submitted' | 'graded';
    assignedQuestion: string;
  };
}

export interface Submission {
  _id: string;
  registerNumber: string;
  userName: string;
  department: string;
  section: string;
  year: string;
  assignedQuestion: string;
  code: string;
  language: string;
  examId: string;
  submittedAt: string;
  status: 'submitted' | 'graded';
}

export interface StudentsResponse {
  success: boolean;
  message: string;
  data: Student[];
  total?: number;
  timestamp?: string;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  data: Submission;
}

export interface StudentValidationResult {
  isValid: boolean;
  errors: string[];
}

// --------------------
// Custom Error Classes
// --------------------
export class TableServiceError extends Error {
  public code: string;
  public statusCode: number;
  public details?: string;
  public timestamp: Date;
  public originalError?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: string, originalError?: any) {
    super(message);
    this.name = 'TableServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.originalError = originalError;
  }
}

export class StudentValidationError extends TableServiceError {
  constructor(message: string = 'Student validation failed', details?: string, originalError?: any) {
    super(message, 'STUDENT_VALIDATION_ERROR', 400, details, originalError);
  }
}

export class StudentFetchError extends TableServiceError {
  constructor(message: string = 'Failed to fetch students', details?: string, originalError?: any) {
    super(message, 'STUDENT_FETCH_ERROR', 500, details, originalError);
  }
}

export class AuthenticationError extends TableServiceError {
  constructor(message: string = 'Authentication failed', details?: string, originalError?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details, originalError);
  }
}

export class NetworkError extends TableServiceError {
  constructor(message: string = 'Network error occurred', details?: string, originalError?: any) {
    super(message, 'NETWORK_ERROR', 503, details, originalError);
  }
}

export class ServerError extends TableServiceError {
  constructor(message: string = 'Server error occurred', details?: string, originalError?: any) {
    super(message, 'SERVER_ERROR', 500, details, originalError);
  }
}

export class NoStudentsFoundError extends TableServiceError {
  constructor(message: string = 'No students found', details?: string, originalError?: any) {
    super(message, 'NO_STUDENTS_FOUND', 404, details, originalError);
  }
}

// --------------------
// Submission Error Classes
// --------------------
export class SubmissionError extends TableServiceError {
  constructor(message: string = 'Submission error occurred', code: string = 'SUBMISSION_ERROR', statusCode: number = 500, details?: string, originalError?: any) {
    super(message, code, statusCode, details, originalError);
  }
}

export class SubmissionNotFoundError extends SubmissionError {
  constructor(message: string = 'Submission not found', details?: string, originalError?: any) {
    super(message, 'SUBMISSION_NOT_FOUND', 404, details, originalError);
  }
}

export class SubmissionFetchError extends SubmissionError {
  constructor(message: string = 'Failed to fetch submission', details?: string, originalError?: any) {
    super(message, 'SUBMISSION_FETCH_ERROR', 500, details, originalError);
  }
}

// --------------------
// Download Error Classes
// --------------------
export class DownloadError extends TableServiceError {
  constructor(message: string = 'Download error occurred', code: string = 'DOWNLOAD_ERROR', statusCode: number = 500, details?: string, originalError?: any) {
    super(message, code, statusCode, details);
    this.originalError = originalError;
  }
}

export class DownloadFailedError extends DownloadError {
  constructor(message: string = 'Download failed', details?: string, originalError?: any) {
    super(message, 'DOWNLOAD_FAILED', 500, details);
    this.originalError = originalError;
  }
}

export class NoSubmissionsFoundError extends DownloadError {
  constructor(message: string = 'No submissions found for download', details?: string, originalError?: any) {
    super(message, 'NO_SUBMISSIONS_FOUND', 404, details);
    this.originalError = originalError;
  }
}

// --------------------
// Validation Functions
// --------------------

/**
 * Validate student filter parameters
 */
export const validateStudentFilter = (filter: StudentFilter): StudentValidationResult => {
  const errors: string[] = [];

  // Department validation
  if (!filter.department || filter.department.trim().length === 0) {
    errors.push('Department is required');
  } else if (filter.department.trim().length > 50) {
    errors.push('Department name must not exceed 50 characters');
  }

  // Section validation
  if (!filter.section || filter.section.trim().length === 0) {
    errors.push('Section is required');
  } else if (filter.section.trim().length > 10) {
    errors.push('Section must not exceed 10 characters');
  }

  // Year validation
  if (!filter.year || filter.year.trim().length === 0) {
    errors.push('Year is required');
  } else {
    const validYears = ['1', '2', '3', '4', 'I', 'II', 'III', 'IV', '1st', '2nd', '3rd', '4th'];
    if (!validYears.includes(filter.year.trim())) {
      errors.push('Year must be a valid academic year');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate student data
 */
export const validateStudentData = (student: Student): StudentValidationResult => {
  const errors: string[] = [];

  // User name validation
  if (!student.userName || student.userName.trim().length === 0) {
    errors.push('Student name is required');
  } else if (student.userName.trim().length < 2) {
    errors.push('Student name must be at least 2 characters long');
  } else if (student.userName.trim().length > 100) {
    errors.push('Student name must not exceed 100 characters');
  }

  // Register number validation
  const registerNumber = student.registerNumber?.toString().trim();
  if (!registerNumber || registerNumber.length === 0) {
    errors.push('Register number is required');
  } else if (registerNumber.length > 20) {
    errors.push('Register number must not exceed 20 characters');
  }

  // Department validation
  if (!student.department || student.department.trim().length === 0) {
    errors.push('Department is required');
  }

  // Section validation
  if (!student.section || student.section.trim().length === 0) {
    errors.push('Section is required');
  }

  // Year validation
  if (!student.year || student.year.trim().length === 0) {
    errors.push('Year is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate submission data
 */
export const validateSubmissionData = (submission: Submission): StudentValidationResult => {
  const errors: string[] = [];

  // Register number validation
  if (!submission.registerNumber || submission.registerNumber.trim().length === 0) {
    errors.push('Register number is required');
  }

  // User name validation
  if (!submission.userName || submission.userName.trim().length === 0) {
    errors.push('User name is required');
  }

  // Code validation
  if (!submission.code || submission.code.trim().length === 0) {
    errors.push('Code is required');
  } else if (submission.code.length > 10000) {
    errors.push('Code exceeds maximum length');
  }

  // Language validation
  const validLanguages = ['javascript', 'python', 'java', 'c', 'cpp'];
  if (!submission.language || !validLanguages.includes(submission.language)) {
    errors.push('Invalid programming language');
  }

  // Assigned question validation
  if (!submission.assignedQuestion || submission.assignedQuestion.trim().length === 0) {
    errors.push('Assigned question is required');
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
 * Sanitize filter parameters by trimming strings
 */
const sanitizeFilter = (filter: StudentFilter): StudentFilter => {
  return {
    department: filter.department?.trim() || '',
    section: filter.section?.trim() || '',
    year: filter.year?.trim() || '',
    examId: filter.examId?.trim() || ''
  };
};

/**
 * Sanitize student data by trimming strings and handling submission data
 */
const sanitizeStudent = (student: any): Student => {
  // Convert registerNumber to string if it's a number
  const registerNumber = student.registerNumber?.toString().trim() || '';
  
  // Handle submission data if present
  const hasSubmitted = student.hasSubmitted || student.submission !== undefined;
  const submission = student.submission ? {
    submittedAt: student.submission.submittedAt || '',
    language: student.submission.language || '',
    status: student.submission.status || 'submitted',
    assignedQuestion: student.submission.assignedQuestion || ''
  } : undefined;

  return {
    _id: student._id || `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userName: student.userName?.toString().trim() || '',
    registerNumber: registerNumber,
    department: student.department?.toString().trim() || '',
    section: student.section?.toString().trim() || '',
    year: student.year?.toString().trim() || '',
    hasSubmitted,
    submission
  };
};

/**
 * Sanitize submission data
 */
const sanitizeSubmission = (submission: any): Submission => {
  return {
    _id: submission._id || `submission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    registerNumber: submission.registerNumber?.toString().trim() || '',
    userName: submission.userName?.toString().trim() || '',
    department: submission.department?.toString().trim() || '',
    section: submission.section?.toString().trim() || '',
    year: submission.year?.toString().trim() || '',
    assignedQuestion: submission.assignedQuestion?.toString().trim() || '',
    code: submission.code || '',
    language: submission.language || 'javascript',
    examId: submission.examId?.toString().trim() || '',
    submittedAt: submission.submittedAt || new Date().toISOString(),
    status: submission.status || 'submitted'
  };
};

/**
 * Sort students by register number
 */
export const sortStudentsByRegisterNumber = (students: Student[]): Student[] => {
  return [...students].sort((a, b) => 
    a.registerNumber.localeCompare(b.registerNumber, undefined, { numeric: true })
  );
};

/**
 * Sort students by name
 */
export const sortStudentsByName = (students: Student[]): Student[] => {
  return [...students].sort((a, b) => 
    a.userName.localeCompare(b.userName)
  );
};

/**
 * Filter students by search query
 */
export const filterStudents = (students: Student[], searchQuery: string): Student[] => {
  if (!searchQuery.trim()) return students;

  const query = searchQuery.toLowerCase().trim();
  return students.filter(student =>
    student.userName.toLowerCase().includes(query) ||
    student.registerNumber.toLowerCase().includes(query) ||
    student.department.toLowerCase().includes(query) ||
    student.section.toLowerCase().includes(query) ||
    student.year.toLowerCase().includes(query)
  );
};

// --------------------
// Core Service Functions
// --------------------

/**
 * Get students by filter with comprehensive error handling and JWT token
 */
export const getStudentsByFilter = async (filter: StudentFilter): Promise<Student[]> => {
  try {
    
    // Step 1: Sanitize filter
    const sanitizedFilter = sanitizeFilter(filter);
    
    // Step 2: Validate filter
    const filterValidation = validateStudentFilter(sanitizedFilter);
    if (!filterValidation.isValid) {
      throw new StudentValidationError(
        'Filter validation failed',
        filterValidation.errors.join('; ')
      );
    }

    // Step 3: Get authentication token
    let token: string | null;
    try {
      token = getToken();
    } catch (tokenError) {
      if (tokenError instanceof TokenHelperError) {
        throw new AuthenticationError(
          'Failed to retrieve authentication token',
          tokenError.details,
          tokenError
        );
      }
      throw new AuthenticationError(
        'Authentication token retrieval failed',
        tokenError instanceof Error ? tokenError.message : 'Unknown token error',
        tokenError
      );
    }

    if (!token) {
      throw new AuthenticationError(
        'Authentication token not found',
        'Please login again to access student data'
      );
    }

    // Step 4: Make API request with JWT token
    
    const response = await axiosInstance.get('/table/students', {
      params: sanitizedFilter,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    // Step 5: Handle response
    if (response.status >= 200 && response.status < 300) {
      const isSuccess = response.data?.success !== false && 
                          !response.data?.error && 
                          !response.data?.message?.toLowerCase().includes('error');
      
      if (isSuccess) {
        // Handle different response structures
        let studentsData: any[] = [];
        
        if (Array.isArray(response.data)) {
          // If response is directly an array
          studentsData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // If response has data property with array
          studentsData = response.data.data;
        } else if (response.data?.students && Array.isArray(response.data.students)) {
          // If response has students property with array
          studentsData = response.data.students;
        } else {
          // Try to extract any array from response
          const arrayKeys = Object.keys(response.data).filter(key => Array.isArray(response.data[key]));
          if (arrayKeys.length > 0) {
            studentsData = response.data[arrayKeys[0]];
          } else {
            studentsData = [];
          }
        }
        
        // Validate and sanitize each student
        const validatedStudents: Student[] = [];
        for (const student of studentsData) {
          try {
            const sanitizedStudent = sanitizeStudent(student);
            const studentValidation = validateStudentData(sanitizedStudent);
            
            if (studentValidation.isValid) {
              validatedStudents.push(sanitizedStudent);
            } else {
              // Invalid student data skipped
            }
          } catch (studentError) {
            // Error processing student
            // Skip this student but continue processing others
          }
        }

        if (validatedStudents.length === 0) {
          throw new NoStudentsFoundError(
            'No valid students found for the given criteria',
            'Please check your filter parameters'
          );
        }

        return validatedStudents;
      } else {
        throw new StudentFetchError(
          response.data?.message || 'Failed to fetch students',
          'Server returned unsuccessful response'
        );
      }
    } else {
      throw new StudentFetchError(
        response.data?.message || 'Failed to fetch students',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    // Handle different types of errors
    if (error instanceof TableServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.statusText;
      const serverDetails = error.response.data?.details || error.response.data;

      let serviceError: TableServiceError;

      switch (status) {
        case 400:
          serviceError = new StudentValidationError(
            serverMessage || 'Bad request',
            serverDetails,
            error
          );
          break;
        case 401:
          serviceError = new AuthenticationError(
            serverMessage || 'Authentication failed',
            'Token may be expired or invalid',
            error
          );
          break;
        case 403:
          serviceError = new AuthenticationError(
            serverMessage || 'Access forbidden',
            'You do not have permission to access student data',
            error
          );
          break;
        case 404:
          serviceError = new NoStudentsFoundError(
            serverMessage || 'No students found',
            'Please check your filter parameters',
            error
          );
          break;
        case 500:
          serviceError = new ServerError(
            serverMessage || 'Internal server error',
            'Please try again later',
            error
          );
          break;
        case 503:
          serviceError = new ServerError(
            serverMessage || 'Service unavailable',
            'Server is temporarily unavailable',
            error
          );
          break;
        default:
          serviceError = new StudentFetchError(
            serverMessage || `Request failed with status ${status}`,
            serverDetails,
            error
          );
      }

      throw serviceError;

    } else if (error.request) {
      throw new NetworkError(
        'No response received from server',
        'Network connection may be unavailable or server is down',
        error
      );

    } else {
      throw new StudentFetchError(
        `Unexpected error: ${error.message}`,
        'An unexpected error occurred while fetching students',
        error
      );
    }
  }
};

/**
 * Get submission by register number
 */
export const getSubmissionByRegisterNumber = async (registerNumber: string): Promise<Submission> => {
  try {
    
    // Validate register number
    if (!registerNumber || registerNumber.trim().length === 0) {
      throw new SubmissionError('Register number is required', 'VALIDATION_ERROR', 400);
    }

    // Get authentication token
    const token = getToken();
    if (!token) {
      throw new AuthenticationError(
        'Authentication token not found',
        'Please login again to access submission data'
      );
    }

    
    const response = await axiosInstance.get(`table/submissions/${registerNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    // Handle response
    if (response.status >= 200 && response.status < 300) {
      if (response.data?.success && response.data?.data) {
        const submissionData = response.data.data;
        
        // Sanitize and validate submission data
        const sanitizedSubmission = sanitizeSubmission(submissionData);
        const submissionValidation = validateSubmissionData(sanitizedSubmission);
        
        if (submissionValidation.isValid) {
          return sanitizedSubmission;
        } else {
          throw new SubmissionError(
            'Invalid submission data received',
            'SUBMISSION_VALIDATION_ERROR',
            500,
            submissionValidation.errors.join('; ')
          );
        }
      } else {
        throw new SubmissionNotFoundError(
          response.data?.message || 'Submission not found'
        );
      }
    } else {
      throw new SubmissionFetchError(
        response.data?.message || 'Failed to fetch submission',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    // Handle different types of errors
    if (error instanceof TableServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.statusText;

      switch (status) {
        case 404:
          throw new SubmissionNotFoundError(serverMessage);
        case 401:
          throw new AuthenticationError(
            serverMessage || 'Authentication failed',
            'Token may be expired or invalid'
          );
        case 403:
          throw new AuthenticationError(
            serverMessage || 'Access forbidden',
            'You do not have permission to access this submission'
          );
        case 400:
          throw new SubmissionError(
            serverMessage || 'Bad request',
            'VALIDATION_ERROR',
            400
          );
        default:
          throw new SubmissionFetchError(
            serverMessage || `Request failed with status ${status}`
          );
      }
    } else if (error.request) {
      throw new NetworkError(
        'No response received from server',
        'Network connection may be unavailable'
      );
    } else {
      throw new SubmissionFetchError(
        error.message || 'Unexpected error occurred while fetching submission'
      );
    }
  }
};

/**
 * Download all submissions as ZIP file
 */
export const downloadSubmissions = async (filter: StudentFilter): Promise<Blob> => {
  try {
    
    // Step 1: Sanitize filter
    const sanitizedFilter = sanitizeFilter(filter);
    
    // Step 2: Validate filter
    const filterValidation = validateStudentFilter(sanitizedFilter);
    if (!filterValidation.isValid) {
      throw new StudentValidationError(
        'Filter validation failed for download',
        filterValidation.errors.join('; ')
      );
    }

    // Step 3: Get authentication token
    const token = getToken();
    if (!token) {
      throw new AuthenticationError(
        'Authentication token not found',
        'Please login again to download submissions'
      );
    }

    // Step 4: Make API request with blob response type
    
    const response = await axiosInstance.get('/table/download-submissions', {
      params: sanitizedFilter,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      responseType: 'blob', // Important for file downloads
      timeout: 30000 // Longer timeout for file downloads
    });

    // Step 5: Handle response
    if (response.status >= 200 && response.status < 300) {
      // Check if response is actually a ZIP file
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/zip')) {
        return response.data;
      } else {
        throw new DownloadError(
          'Invalid file format received from server',
          `Expected ZIP file but got: ${contentType}`
        );
      }
    } else {
      throw new DownloadFailedError(
        'Download request failed',
        `Server returned status: ${response.status}`
      );
    }

  } catch (error: any) {
    // Handle different types of errors
    if (error instanceof TableServiceError) {
      throw error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.statusText;

      // Try to read error message from blob if it's not a ZIP file
      if (error.response.data instanceof Blob && error.response.data.type.includes('application/json')) {
        try {
          const errorText = await error.response.data.text();
          const errorData = JSON.parse(errorText);
          throw new DownloadFailedError(
            errorData.message || 'Download failed',
            errorData.details
          );
        } catch (parseError) {
          // If we can't parse the error, use generic message
        }
      }

      switch (status) {
        case 404:
          throw new NoSubmissionsFoundError(
            serverMessage || 'No submissions found for download'
          );
        case 401:
          throw new AuthenticationError(
            serverMessage || 'Authentication failed for download',
            'Token may be expired or invalid'
          );
        case 403:
          throw new AuthenticationError(
            serverMessage || 'Access forbidden for download',
            'You do not have permission to download submissions'
          );
        case 400:
          throw new DownloadError(
            serverMessage || 'Bad request for download',
            'VALIDATION_ERROR',
            400
          );
        case 500:
          throw new DownloadFailedError(
            serverMessage || 'Server error during download',
            'Please try again later'
          );
        default:
          throw new DownloadFailedError(
            serverMessage || `Download failed with status ${status}`
          );
      }
    } else if (error.request) {
      throw new NetworkError(
        'No response received from server during download',
        'Network connection may be unavailable'
      );
    } else {
      throw new DownloadFailedError(
        error.message || 'Unexpected error occurred during download'
      );
    }
  }
};

/**
 * Enhanced version with detailed logging
 */
export const getStudentsByFilterWithLogging = async (filter: StudentFilter): Promise<Student[]> => {
  try {
    const students = await getStudentsByFilter(filter);
    
    return students;
  } catch (error) {
    throw error;
  }
};

// --------------------
// Error Utility Functions
// --------------------

/**
 * Check if error is a TableServiceError
 */
export const isTableServiceError = (error: any): error is TableServiceError => {
  return error instanceof TableServiceError;
};

/**
 * Check if error is due to validation failure
 */
export const isValidationError = (error: any): boolean => {
  return error instanceof StudentValidationError;
};

/**
 * Check if error is due to authentication issues
 */
export const isAuthenticationError = (error: any): boolean => {
  return error instanceof AuthenticationError;
};

/**
 * Check if error is due to no students found
 */
export const isNoStudentsFoundError = (error: any): boolean => {
  return error instanceof NoStudentsFoundError;
};

/**
 * Check if error is due to submission issues
 */
export const isSubmissionError = (error: any): boolean => {
  return error instanceof SubmissionError;
};

/**
 * Check if error is due to submission not found
 */
export const isSubmissionNotFoundError = (error: any): boolean => {
  return error instanceof SubmissionNotFoundError;
};

/**
 * Check if error is due to download issues
 */
export const isDownloadError = (error: any): boolean => {
  return error instanceof DownloadError;
};

/**
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (!isTableServiceError(error)) {
    return 'An unexpected error occurred while fetching data';
  }

  const errorMessages: Record<string, string> = {
    'STUDENT_VALIDATION_ERROR': 'Please check your search criteria and try again.',
    'STUDENT_FETCH_ERROR': 'Failed to fetch students. Please try again.',
    'AUTHENTICATION_ERROR': 'Please log in to continue.',
    'NO_STUDENTS_FOUND': 'No students found matching your criteria.',
    'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
    'SERVER_ERROR': 'Server error occurred. Please try again later.',
    'SUBMISSION_NOT_FOUND': 'No submission found for this student.',
    'SUBMISSION_FETCH_ERROR': 'Failed to fetch submission details.',
    'SUBMISSION_VALIDATION_ERROR': 'Invalid submission data received.',
    'VALIDATION_ERROR': 'Invalid request parameters.',
    'DOWNLOAD_ERROR': 'Error preparing download. Please try again.',
    'DOWNLOAD_FAILED': 'Download failed. Please try again.',
    'NO_SUBMISSIONS_FOUND': 'No submissions found for download.'
  };

  return errorMessages[error.code] || error.message || 'A service error occurred';
};

/**
 * Get user-friendly submission error message
 */
export const getSubmissionErrorMessage = (error: any): string => {
  if (isSubmissionError(error)) {
    return getUserFriendlyErrorMessage(error);
  }
  return 'An unexpected error occurred while fetching submission details.';
};

/**
 * Get user-friendly download error message
 */
export const getDownloadErrorMessage = (error: any): string => {
  if (isDownloadError(error)) {
    return getUserFriendlyErrorMessage(error);
  }
  return 'An unexpected error occurred during download.';
};

// --------------------
// Export all utilities
// --------------------
export default {
  getStudentsByFilter,
  getStudentsByFilterWithLogging,
  getSubmissionByRegisterNumber,
  downloadSubmissions,
  validateStudentFilter,
  validateStudentData,
  validateSubmissionData,
  sortStudentsByRegisterNumber,
  sortStudentsByName,
  filterStudents,
  isTableServiceError,
  isValidationError,
  isAuthenticationError,
  isNoStudentsFoundError,
  isSubmissionError,
  isSubmissionNotFoundError,
  isDownloadError,
  getUserFriendlyErrorMessage,
  getSubmissionErrorMessage,
  getDownloadErrorMessage,
  TableServiceError,
  StudentValidationError,
  StudentFetchError,
  AuthenticationError,
  NetworkError,
  ServerError,
  NoStudentsFoundError,
  SubmissionError,
  SubmissionNotFoundError,
  SubmissionFetchError,
  DownloadError,
  DownloadFailedError,
  NoSubmissionsFoundError
};