import axiosInstance from './axiosInstance';

interface StudentFilter {
  department: string;
  section: string;
  year: string;
}

export interface Student {
  userName: string;
  registerNumber: string;
  department: string;
  section: string;
  year: string;
}

export const getStudentsByFilter = async (filter: StudentFilter): Promise<Student[]> => {
  try {
    const response = await axiosInstance.get<Student[]>('/table/students', {
      params: filter,
    });
    return response.data;
  } catch (err) {
    console.error("Failed to fetch students:", err);
    throw err;
  }
};
