import axios from "axios";

// Point directly to your local Uvicorn instance
export const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach the admin token to every request [cite: 155, 156]
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token"); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) { 
      localStorage.removeItem("admin_token"); 
      localStorage.removeItem("admin_username"); 
      if (window.location.pathname !== "/admin-login") { 
        window.location.href = "/admin-login"; 
      }
    }
    return Promise.reject(error);
  }
);

export default api;