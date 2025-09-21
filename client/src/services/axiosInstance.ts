import axios, {
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string }>) => {
    let errorMsg = "Unknown error occurred";

    if (error.response) {
      const status = error.response.status;
      const dataMessage = error.response.data?.message;
      errorMsg = dataMessage || `Server Error: ${status}`;
    } else if (error.request) {
      errorMsg = "No response from server. Check your network.";
    } else {
      errorMsg = error.message;
    }

    console.error("API Error:", errorMsg);

    return Promise.reject({
      message: errorMsg,
      status: error.response?.status,
      originalError: error,
    });
  }
);

export default axiosInstance;
