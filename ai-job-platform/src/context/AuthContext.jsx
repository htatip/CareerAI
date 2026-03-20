import { createContext, useContext, useState } from "react";
import { logout as logoutService } from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [resumeId, setResumeId] = useState(localStorage.getItem("resumeId"));

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    logoutService();
    setToken(null);
    setResumeId(null);
  };

  const saveResumeId = (id) => {
    localStorage.setItem("resumeId", id);
    setResumeId(String(id));
  };

  return (
    <AuthContext.Provider value={{ token, resumeId, login, logout, saveResumeId }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
