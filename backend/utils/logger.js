// backend/utils/logger.js
// ✅ Environment-based logging utility

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLogLevel = process.env.LOG_LEVEL || (isDevelopment ? 'DEBUG' : 'INFO');

const shouldLog = (level) => {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
};

export const logger = {
  error: (...args) => {
    if (shouldLog('ERROR')) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },
  
  warn: (...args) => {
    if (shouldLog('WARN')) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  
  info: (...args) => {
    if (shouldLog('INFO')) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  
  debug: (...args) => {
    if (shouldLog('DEBUG') && isDevelopment) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  
  // Special methods for specific use cases
  security: (...args) => {
    // Security logs should always be logged in production
    console.warn('[SECURITY]', new Date().toISOString(), ...args);
  },
  
  audit: (...args) => {
    // Audit logs for compliance
    console.log('[AUDIT]', new Date().toISOString(), ...args);
  }
};

// For development convenience
export const log = logger.debug;
export const logInfo = logger.info;
export const logError = logger.error;
export const logWarn = logger.warn;