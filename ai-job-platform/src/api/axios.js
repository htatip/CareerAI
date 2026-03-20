import axios from "axios";


const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});


API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

   
    if (status === 401 && !url.includes("/auth/")) {
      localStorage.removeItem("token");
      localStorage.removeItem("resumeId");
      window.dispatchEvent(new CustomEvent("auth:logout"));
      window.location.href = "/login";
    }

    if (status === 403) {
      console.warn("Access denied:", url);
    }

    if (status === 429) {
      console.warn("Rate limited — too many requests");
    }

    if (status >= 500) {
      console.error("Server error:", error.response?.data?.message || "Internal error");
    }

    return Promise.reject(error);
  }
);

export default API;