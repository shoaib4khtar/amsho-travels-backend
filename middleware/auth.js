// ══════════════════════════════════════════════
// AUTH MIDDLEWARE — JWT verification & role guards
// ══════════════════════════════════════════════

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * verifyToken — Extracts and validates JWT from Authorization header.
 * Attaches the full user object to req.user for downstream use.
 *
 * Expected header format: "Bearer <token>"
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from DB (exclude password)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * isAdmin — Allows only users with role === 'admin'.
 * Must be used AFTER verifyToken middleware.
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
  });
};

/**
 * isStaff — Allows users with role === 'staff' OR 'admin'.
 * (Admins can do everything staff can do.)
 * Must be used AFTER verifyToken middleware.
 */
const isStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'staff' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Staff privileges required.',
  });
};

module.exports = { verifyToken, isAdmin, isStaff };
