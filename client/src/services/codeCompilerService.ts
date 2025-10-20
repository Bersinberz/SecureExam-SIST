import { getToken } from '../utils/tokenHelper';
import axiosInstance from './axiosInstance';

// Types
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
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  data?: {
    submissionId: string;
    submittedAt: string;
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

// API Service Functions
export const codeCompilerService = {
  async fetchExamData(): Promise<ExamDataResponse> {
    const token = getToken();
    
    const response = await axiosInstance.get('/code/getdata', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Execute code
  async executeCode(language: string, code: string): Promise<CodeExecutionResult> {
    const token = getToken();
    
    const response = await axiosInstance.post('/execute/run', {
      language,
      code
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },


  // Submit code for evaluation
  async submitCode(language: string, code: string, assignedQuestion: string): Promise<SubmissionResponse> {
    const token = getToken();
    
    const response = await axiosInstance.post('/code/submit', {
      language,
      code,
      assignedQuestion
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

};


export default codeCompilerService;