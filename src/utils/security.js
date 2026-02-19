// src/utils/security.js
import DOMPurify from 'dompurify';

// Security configuration - frozen to prevent runtime modification
const SECURITY_CONFIG = Object.freeze({
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true
  },
  FILE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  SESSION: {
    DEFAULT_TIMEOUT: 3600000, // 1 hour
    CSRF_HEADER: 'X-CSRF-Token'
  }
});

// Input sanitization with DOMPurify
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Use DOMPurify for robust HTML sanitization
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true // Keep text content
  });
  
  return sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  const { PASSWORD } = SECURITY_CONFIG;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < PASSWORD.MIN_LENGTH) {
    errors.push(`รหัสผ่านต้องมีอย่างน้อย ${PASSWORD.MIN_LENGTH} ตัวอักษร`);
  }
  if (PASSWORD.REQUIRE_UPPERCASE && !hasUpperCase) {
    errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว');
  }
  if (PASSWORD.REQUIRE_LOWERCASE && !hasLowerCase) {
    errors.push('รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว');
  }
  if (PASSWORD.REQUIRE_NUMBERS && !hasNumbers) {
    errors.push('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
  }
  if (PASSWORD.REQUIRE_SPECIAL_CHARS && !hasSpecialChar) {
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
  const { PASSWORD } = SECURITY_CONFIG;
  let score = 0;
  
  if (password.length >= PASSWORD.MIN_LENGTH) score += 1;
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

// JWT token validation
export const isJWTExpired = (token) => {
  if (!token) return true;
  
  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token has exp field and if it's expired
    return payload.exp && payload.exp < currentTime;
  } catch (error) {
    console.warn('Invalid JWT token format:', error);
    return true; // Treat invalid tokens as expired
  }
};

// Enhanced file validation with extension and MIME type checks
export const validateFile = (file) => {
  const { FILE } = SECURITY_CONFIG;
  const maxSize = parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || FILE.MAX_SIZE;
  const allowedTypes = process.env.REACT_APP_ALLOWED_FILE_TYPES?.split(',') || FILE.ALLOWED_MIME_TYPES;
  
  const errors = [];
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`ไฟล์ใหญ่เกินไป (สูงสุด ${maxSize / 1024 / 1024}MB)`);
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    errors.push('ประเภทไฟล์ไม่ได้รับอนุญาต (MIME type)');
  }
  
  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = FILE.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  
  if (!hasValidExtension) {
    errors.push(`นามสกุลไฟล์ไม่ได้รับอนุญาต (อนุญาต: ${FILE.ALLOWED_EXTENSIONS.join(', ')})`);
  }
  
  // Additional security: Check for double extensions
  const extensionCount = (fileName.match(/\./g) || []).length;
  if (extensionCount > 1) {
    errors.push('ไฟล์ไม่สามารถมีนามสกุลซ้อนได้');
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

// Session timeout management with CSRF protection
export const setupSessionTimeout = () => {
  const { SESSION } = SECURITY_CONFIG;
  const timeout = parseInt(process.env.REACT_APP_SESSION_TIMEOUT) || SESSION.DEFAULT_TIMEOUT;
  let timeoutId;

  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // Auto logout on timeout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('csrfToken');
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

// CSRF Token management
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const getCSRFToken = () => {
  let token = localStorage.getItem('csrfToken');
  if (!token) {
    token = generateCSRFToken();
    localStorage.setItem('csrfToken', token);
  }
  return token;
};

export const getCSRFHeaders = () => {
  return {
    [SECURITY_CONFIG.SESSION.CSRF_HEADER]: getCSRFToken()
  };
};

// ⚠️ WARNING: This is NOT secure storage - tokens should be in httpOnly cookies
// This is a temporary solution for development only
export const secureStorage = {
  setItem: (key, value) => {
    try {
      // ⚠️ Base64 is NOT encryption - easily decoded
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ Storing ${key} in localStorage - NOT secure for production`);
      }
      
      const encoded = btoa(JSON.stringify(value));
      localStorage.setItem(key, encoded);
    } catch (error) {
      console.warn('Failed to store item securely:', error);
    }
  },

  getItem: (key) => {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;
      return JSON.parse(atob(encoded));
    } catch (error) {
      console.warn('Failed to retrieve item securely:', error);
      return null;
    }
  },

  removeItem: (key) => {
    localStorage.removeItem(key);
  }
};

// ✅ Secure token storage recommendation
export const secureTokenStorage = {
  // For production: Use httpOnly cookies instead of localStorage
  setToken: (token) => {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Production should use httpOnly cookies for tokens');
    }
    // Temporary localStorage solution
    localStorage.setItem('token', token);
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  removeToken: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('csrfToken');
  }
};

// Content Security Policy helper - production-ready
export const setupCSP = () => {
  // Add meta tag for CSP if not already present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    
    // Production CSP - no unsafe-inline
    if (process.env.NODE_ENV === 'production') {
      meta.content = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.github.com https://github.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; ');
    } else {
      // Development CSP - allow unsafe-inline for hot reload
      meta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.github.com https://github.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com ws: wss:",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; ');
    }
    
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