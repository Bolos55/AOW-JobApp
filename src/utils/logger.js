// src/utils/logger.js
// ✅ Frontend logging utility

const isDevelopment = process.env.NODE_ENV === 'development';
const enableLogs = isDevelopment || process.env.REACT_APP_ENABLE_CONSOLE_LOGS === 'true';

export const logger = {
  error: (...args) => {
    // Always log errors
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },
  
  warn: (...args) => {
    if (enableLogs) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  
  info: (...args) => {
    if (enableLogs) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  }
};

// For development convenience
export const log = logger.debug;
export const logInfo = logger.info;
export const logError = logger.error;
export const logWarn = logger.warn;