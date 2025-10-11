import { getToken } from '../utils/tokenHelper';
import axiosInstance from './axiosInstance';

export interface ExamDetails {
    name: string;
    time: number;
    department: string;
    section: string;
    year: string;
    file?: File | null;
}

export interface CreateExamResponse {
    message: string;
    examId?: string;
    data?: any;
}

export const createExam = async (examDetails: ExamDetails, file: File): Promise<CreateExamResponse> => {
    try {
        const token = getToken(); // get JWT token

        if (!token) {
            throw new Error("Authentication token not found. Please login again.");
        }

        const formData = new FormData();
        formData.append('name', examDetails.name);
        formData.append('time', examDetails.time.toString());
        formData.append('department', examDetails.department);
        formData.append('section', examDetails.section);
        formData.append('year', examDetails.year);
        formData.append('file', file);

        const response = await axiosInstance.post('/exam/create', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`,
            },
        });

        return response.data;
    } catch (error: any) {
        console.error('Create exam error:', error.response?.data || error.message);
        throw error;
    }
};