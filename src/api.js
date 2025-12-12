// src/api.js

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_BASE = isLocal
  ? "http://localhost:5000"          // ตอนรัน backend ที่เครื่องตัวเอง
  : "https://aow-jobapp.onrender.com"; // ✅ ชี้ไป BACKEND บน Render (ไม่ใช่ frontend)

export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
