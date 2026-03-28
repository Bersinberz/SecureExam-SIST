import axios, {
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 30000,
});

// Attach JWT from storage on every request
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Centralised response error handling
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      // Token expired, invalid, or revoked — clear and redirect
      const token = localStorage.getItem("jwtToken");
      if (token) {
        // Best-effort server-side revocation
        fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      localStorage.removeItem("jwtToken");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    const message =
      error.response?.data?.message ??
      (error.request ? "No response from server. Check your network." : error.message);

    return Promise.reject({
      message,
      status: error.response?.status,
      originalError: error,
    });
  }
);

export default axiosInstance;
