// src/utils/security.js

// Input sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`รหัสผ่านต้องมีอย่างน้อย ${minLength} ตัวอักษร`);
  }
  if (!hasUpperCase) {
    errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว');
  }
  if (!hasLowerCase) {
    errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว');
  }
  if (!hasNumbers) {
    errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
  }
  if (!hasSpecialChar) {
    errors.push('รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

// Calculate password strength score
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  if (password.length >= 16) score += 1;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};

// File validation
export const validateFile = (file) => {
  const maxSize = parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
  const allowedTypes = process.env.REACT_APP_ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const errors = [];

  if (file.size > maxSize) {
    errors.push(`ไฟล์ใหญ่เกินไป (สูงสุด ${maxSize / 1024 / 1024}MB)`);
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('ประเภทไฟล์ไม่ได้รับอนุญาต');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Thai format)
export const validatePhone = (phone) => {
  const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

// Session timeout management
export const setupSessionTimeout = () => {
  const timeout = parseInt(process.env.REACT_APP_SESSION_TIMEOUT) || 3600000; // 1 hour
  let timeoutId;

  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // Auto logout on timeout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }, timeout);
  };

  // Reset timeout on user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach(event => {
    document.addEventListener(event, resetTimeout, true);
  });

  resetTimeout(); // Initial setup
};

// Secure local storage
export const secureStorage = {
  setItem: (key, value) => {
    try {
      const encrypted = btoa(JSON.stringify(value)); // Simple base64 encoding
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('Failed to store item securely:', error);
    }
  },

  getItem: (key) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.warn('Failed to retrieve item securely:', error);
      return null;
    }
  },

  removeItem: (key) => {
    localStorage.removeItem(key);
  }
};

// Content Security Policy helper
export const setupCSP = () => {
  // Add meta tag for CSP if not already present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.github.com https://github.com;";
    document.head.appendChild(meta);
  }
};

// Rate limiting for client-side requests
export const createClientRateLimit = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();

  return (key = 'default') => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(key)) {
      requests.set(key, requests.get(key).filter(time => time > windowStart));
    } else {
      requests.set(key, []);
    }

    const currentRequests = requests.get(key);

    if (currentRequests.length >= maxRequests) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    currentRequests.push(now);
    return true;
  };
};

// Prevent console access in production
export const protectConsole = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_ENABLE_CONSOLE_LOGS) {
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.error = noop;
    console.info = noop;
    console.debug = noop;
  }
};