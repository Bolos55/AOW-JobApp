// src/api.js
export const API_BASE = "http://localhost:5000";

export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};