// src/api.js
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_BASE = isLocal
  ? "http://localhost:5000" // หรือ port ที่ backend รันตอน dev จริง ๆ
  : "https://aow-jobapp-backend.onrender.com"; // URL backend บน Render (ไม่ต้องต่อ /api)

export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
