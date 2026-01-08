// src/api.js
import { isTokenExpired, forceLogout } from './utils/tokenUtils';
import { logger } from './utils/logger';

const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.startsWith("192.168.");

export const API_BASE = isLocal
  ? "http://localhost:5000"
  : process.env.REACT_APP_API_BASE || "https://aow-jobapp-backend.onrender.com";

// ✅ Only log in development
logger.debug('🌐 API Configuration:', {
  hostname: window.location.hostname,
  isLocal,
  API_BASE
});

export const authHeader = () => {
  const token = localStorage.getItem("token");
  
  // ตรวจสอบว่า token หมดอายุหรือไม่
  if (token && isTokenExpired(token)) {
    forceLogout('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    return {};
  }
  
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Enhanced fetch with automatic token validation
export const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  
  // ตรวจสอบ token ก่อนเรียก API
  if (token && isTokenExpired(token)) {
    forceLogout('Token หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    throw new Error('Token expired');
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...options.headers,
    },
  });
  
  // ตรวจสอบ response สำหรับ JWT errors
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    if (data.message && (data.message.includes('jwt') || data.message.includes('token'))) {
      forceLogout('Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
      throw new Error('Invalid token');
    }
  }
  
  return response;
};
