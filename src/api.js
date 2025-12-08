// ✅ src/api.js (เวอร์ชันที่ถูกต้อง)

export const API_BASE = "http://localhost:10000";


export const authHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
