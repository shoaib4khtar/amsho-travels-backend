// ══════════════════════════════════════════════
// ERROR HANDLER MIDDLEWARE — Global error catcher
// ══════════════════════════════════════════════

/**
 * Centralized error handler.
 * Catches all errors thrown in routes/controllers and returns
 * a consistent JSON response.
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', err.stack || err.message);
  }

  let statusCode = err.statusCode || 500;
  let message    = err.message || 'Internal Server Error';

  // ── Mongoose validation error ──
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.join('. ');
  }

  // ── Mongoose duplicate key error ──
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists.`;
  }

  // ── Mongoose bad ObjectId ──
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
