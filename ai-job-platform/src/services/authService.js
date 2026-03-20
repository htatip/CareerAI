import API from "../api/axios";

export const register = (data) => API.post("/auth/register", data);

export const login = async ({ email, password }) => {
  const res = await API.post("/auth/login", { email, password });
  const token = res.data.data;
  localStorage.setItem("token", token);
  return token;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("resumeId");
};