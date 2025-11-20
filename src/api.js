// src/api.js
export const API_BASE = "https://aow-jobapp.onrender.com/api";

export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
