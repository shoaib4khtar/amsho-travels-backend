// ══════════════════════════════════════════════
// LOGGER UTILITY — Basic request & event logging
// ══════════════════════════════════════════════

/**
 * Simple logger with timestamps and color-coded levels.
 * In production, replace with Winston or Pino for file/cloud logging.
 */
const logger = {
  info: (message, data = '') => {
    console.log(`[${new Date().toISOString()}] ℹ️  INFO: ${message}`, data);
  },

  success: (message, data = '') => {
    console.log(`[${new Date().toISOString()}] ✅ SUCCESS: ${message}`, data);
  },

  warn: (message, data = '') => {
    console.warn(`[${new Date().toISOString()}] ⚠️  WARN: ${message}`, data);
  },

  error: (message, data = '') => {
    console.error(`[${new Date().toISOString()}] ❌ ERROR: ${message}`, data);
  },

  api: (method, path, status, duration) => {
    const statusEmoji = status < 400 ? '✅' : status < 500 ? '⚠️' : '❌';
    console.log(
      `[${new Date().toISOString()}] ${statusEmoji} ${method} ${path} → ${status} (${duration}ms)`
    );
  },
};

module.exports = logger;
