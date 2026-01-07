// src/utils/auth.js
import { API_BASE, authHeader } from "../api";

/**
 * Logout utility function
 * ใช้ได้ในทุก component ที่ต้องการ logout
 */
export const logout = async (onlineStatus = null) => {
  try {
    // ตั้งสถานะออฟไลน์ก่อน logout
    if (onlineStatus?.setOffline) {
      await onlineStatus.setOffline();
    }

    // ลบข้อมูลจาก localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    // Redirect ไปหน้า login
    window.location.href = '/login';
  } catch (err) {
    console.error('Logout error:', err);
    // ถึงแม้จะ error ก็ยัง logout ได้
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};

/**
 * Check if user is logged in
 */
export const isLoggedIn = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (err) {
    console.error('Get current user error:', err);
    return null;
  }
};

/**
 * Get current token from localStorage
 */
export const getCurrentToken = () => {
  return localStorage.getItem('token');
};

/**
 * Set user and token to localStorage
 */
export const setAuthData = (user, token) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    
    // Trigger auth change event
    window.dispatchEvent(new Event('auth-change'));
  } catch (err) {
    console.error('Set auth data error:', err);
  }
};

/**
 * Clear all auth data
 */
export const clearAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  
  // Trigger auth change event
  window.dispatchEvent(new Event('auth-change'));
};

/**
 * Refresh user data from server
 */
export const refreshUserData = async () => {
  try {
    const token = getCurrentToken();
    if (!token) return null;

    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: authHeader()
    });

    if (response.ok) {
      const userData = await response.json();
      setAuthData(userData, token);
      return userData;
    } else {
      // Token might be expired
      clearAuthData();
      return null;
    }
  } catch (err) {
    console.error('Refresh user data error:', err);
    return null;
  }
};