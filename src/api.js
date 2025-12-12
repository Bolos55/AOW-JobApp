// ✅ src/api.js (เวอร์ชันที่ถูกต้อง)

export const API_BASE = "https://aow-jobapp-frontend.onrender.com/login";


export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
