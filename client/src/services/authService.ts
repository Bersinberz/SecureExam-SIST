import axios from "./axiosInstance";

export interface LoginData {
  identifier: string;
  password: string;
  userType: "student" | "staff";
}

export interface LoginResponse {
  token: string;
  message?: string;
}

export const login = async (data: LoginData): Promise<LoginResponse> => {
  const response = await axios.post("/auth/login", data, { withCredentials: true });
  const token = response.data.token;
  localStorage.setItem("jwtToken", token);
  return response.data;
};

export const getToken = (): string | null => localStorage.getItem("jwtToken");

export const logout = () => {
  localStorage.removeItem("jwtToken");
};
