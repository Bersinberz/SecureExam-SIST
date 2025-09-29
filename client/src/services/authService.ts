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
}

export const login = async (data: LoginData): Promise<LoginResponse> => {
  try {
    const response = await axios.post("/auth/login", data);
    const token = response.data.data?.token;

    if (!token) {
      console.warn("Token not found in response:", response.data);
      return { token: "" };
    }

    storeToken(token);

    return response.data.data;
  } catch (error: any) {
    console.error("Login error:", error.response?.data || error.message);
    throw error;
  }
};