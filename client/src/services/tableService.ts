import axiosInstance from './axiosInstance';
import { getToken, TokenHelperError, } from '../utils/tokenHelper';

// --------------------
// Interfaces
// --------------------
export interface StudentFilter {
  department: string;
  section: string;
  year: string;
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

export interface StudentsResponse {
  success: boolean;
  message: string;
  data: Student[];
  total?: number;
  timestamp?: string;
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
    year: filter.year?.trim() || ''
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
    console.log('🚀 [tableService] Starting getStudentsByFilter with filter:', filter);
    
    // Step 1: Sanitize filter
    const sanitizedFilter = sanitizeFilter(filter);
    console.log('🔧 [tableService] Sanitized filter:', sanitizedFilter);
    
    // Step 2: Validate filter
    const filterValidation = validateStudentFilter(sanitizedFilter);
    if (!filterValidation.isValid) {
      console.error('❌ [tableService] Filter validation failed:', filterValidation.errors);
      throw new StudentValidationError(
        'Filter validation failed',
        filterValidation.errors.join('; ')
      );
    }

    // Step 3: Get authentication token
    let token: string | null;
    try {
      token = getToken();
      console.log('🔑 [tableService] Token retrieved:', token ? 'Yes' : 'No');
    } catch (tokenError) {
      console.error('❌ [tableService] Token retrieval error:', tokenError);
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
      console.error('❌ [tableService] No token found');
      throw new AuthenticationError(
        'Authentication token not found',
        'Please login again to access student data'
      );
    }

    // Step 4: Make API request with JWT token
    console.log('📡 [tableService] Making API request to /table/students with params:', sanitizedFilter);
    
    const response = await axiosInstance.get('/table/students', {
      params: sanitizedFilter,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 15000
    });

    console.log('✅ [tableService] API Response received:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : 'no data'
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
          console.log('📊 [tableService] Response is direct array, length:', studentsData.length);
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          // If response has data property with array
          studentsData = response.data.data;
          console.log('📊 [tableService] Response has data array, length:', studentsData.length);
        } else if (response.data?.students && Array.isArray(response.data.students)) {
          // If response has students property with array
          studentsData = response.data.students;
          console.log('📊 [tableService] Response has students array, length:', studentsData.length);
        } else {
          // Try to extract any array from response
          const arrayKeys = Object.keys(response.data).filter(key => Array.isArray(response.data[key]));
          if (arrayKeys.length > 0) {
            studentsData = response.data[arrayKeys[0]];
            console.log('📊 [tableService] Found array in key:', arrayKeys[0], 'length:', studentsData.length);
          } else {
            console.warn('⚠️ [tableService] No array found in response, using empty array');
            studentsData = [];
          }
        }

        console.log('📋 [tableService] Raw students data received:', studentsData);
        
        // Validate and sanitize each student
        const validatedStudents: Student[] = [];
        for (const student of studentsData) {
          try {
            const sanitizedStudent = sanitizeStudent(student);
            const studentValidation = validateStudentData(sanitizedStudent);
            
            if (studentValidation.isValid) {
              validatedStudents.push(sanitizedStudent);
              console.log(`✅ [tableService] Validated student: ${sanitizedStudent.registerNumber} - ${sanitizedStudent.userName}`, {
                hasSubmitted: sanitizedStudent.hasSubmitted,
                submission: sanitizedStudent.submission
              });
            } else {
              console.warn('⚠️ [tableService] Invalid student data skipped:', studentValidation.errors, 'Student:', student);
            }
          } catch (studentError) {
            console.error('❌ [tableService] Error processing student:', studentError, 'Student data:', student);
            // Skip this student but continue processing others
          }
        }

        console.log('📈 [tableService] Validated students count:', validatedStudents.length);
        console.log('📊 [tableService] Submission statistics:', {
          total: validatedStudents.length,
          withSubmissions: validatedStudents.filter(s => s.hasSubmitted).length,
          withoutSubmissions: validatedStudents.filter(s => !s.hasSubmitted).length
        });

        if (validatedStudents.length === 0) {
          throw new NoStudentsFoundError(
            'No valid students found for the given criteria',
            'Please check your filter parameters'
          );
        }

        console.log('🎉 [tableService] Final validated students:', validatedStudents);
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
    console.error('❌ [tableService] Error in getStudentsByFilter:', {
      error,
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      stack: error?.stack
    });

    // Handle different types of errors
    if (error instanceof TableServiceError) {
      console.log('🔄 [tableService] Re-throwing TableServiceError:', error.message);
      throw error;
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.statusText;
      const serverDetails = error.response.data?.details || error.response.data;

      console.log('📡 [tableService] Axios response error:', { status, serverMessage, serverDetails });

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
      console.log('🌐 [tableService] Network error - no response received');
      throw new NetworkError(
        'No response received from server',
        'Network connection may be unavailable or server is down',
        error
      );

    } else {
      console.log('💥 [tableService] Unexpected error:', error.message);
      throw new StudentFetchError(
        `Unexpected error: ${error.message}`,
        'An unexpected error occurred while fetching students',
        error
      );
    }
  }
};

/**
 * Enhanced version with detailed logging
 */
export const getStudentsByFilterWithLogging = async (filter: StudentFilter): Promise<Student[]> => {
  console.log('🚀 [tableService] STARTING ENHANCED STUDENT FETCH:', {
    filter,
    timestamp: new Date().toISOString(),
    hasToken: !!getToken()
  });

  try {
    const students = await getStudentsByFilter(filter);
    
    console.log('✅ [tableService] ENHANCED FETCH SUCCESS:', {
      totalStudents: students.length,
      sampleStudent: students[0],
      studentsWithSubmissions: students.filter(s => s.hasSubmitted).length,
      timestamp: new Date().toISOString()
    });

    return students;
  } catch (error) {
    console.error('❌ [tableService] ENHANCED FETCH FAILED:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
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
 * Get user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: any): string => {
  if (!isTableServiceError(error)) {
    return 'An unexpected error occurred while fetching student data';
  }

  const errorMessages: Record<string, string> = {
    'STUDENT_VALIDATION_ERROR': 'Please check your search criteria and try again.',
    'STUDENT_FETCH_ERROR': 'Failed to fetch students. Please try again.',
    'AUTHENTICATION_ERROR': 'Please log in to continue.',
    'NO_STUDENTS_FOUND': 'No students found matching your criteria.',
    'NETWORK_ERROR': 'Network connection issue. Please check your internet connection.',
    'SERVER_ERROR': 'Server error occurred. Please try again later.'
  };

  return errorMessages[error.code] || error.message || 'A student service error occurred';
};

// --------------------
// Export all utilities
// --------------------
export default {
  getStudentsByFilter,
  getStudentsByFilterWithLogging,
  validateStudentFilter,
  validateStudentData,
  sortStudentsByRegisterNumber,
  sortStudentsByName,
  filterStudents,
  isTableServiceError,
  isValidationError,
  isAuthenticationError,
  isNoStudentsFoundError,
  getUserFriendlyErrorMessage,
  
  // Error classes
  TableServiceError,
  StudentValidationError,
  StudentFetchError,
  AuthenticationError,
  NetworkError,
  ServerError,
  NoStudentsFoundError
};