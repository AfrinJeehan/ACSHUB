import axios from "axios";

// One place to change if your backend ever runs on a different port/host.
export const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach the admin token (if we have one) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend says our session is invalid/expired, clear it and send
// the admin back to the login page automatically.
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