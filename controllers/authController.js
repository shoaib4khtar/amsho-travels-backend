// ══════════════════════════════════════════════
// AUTH CONTROLLER — Login, Register, Profile
// ══════════════════════════════════════════════

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

/**
 * Generate JWT token for authenticated user.
 * Token expires in 7 days.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/login ──────────────────────
// Public — Anyone can attempt login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find user (explicitly select password since it's excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate token
    const token = generateToken(user);

    logger.success(`User logged in: ${user.email} (${user.role})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/register ───────────────────
// Protected — Only admin can create new users
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    // Only admin can set role; default to 'staff'
    const userRole = (role === 'admin' && req.user.role === 'admin') ? 'admin' : 'staff';

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered.',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: userRole,
    });

    logger.success(`New ${userRole} created: ${user.email} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} account created successfully.`,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/auth/profile ─────────────────────
// Protected — Returns current user info
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/auth/staff ───────────────────────
// Protected (Admin) — List all staff accounts
const getStaff = async (req, res, next) => {
  try {
    const staff = await User.find({ role: 'staff' }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      data: staff,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/auth/staff/:id ────────────────
// Protected (Admin) — Delete a staff account
const deleteStaff = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.',
      });
    }

    // Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin accounts.',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    logger.info(`Staff deleted: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Staff account deleted.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getProfile,
  getStaff,
  deleteStaff,
};
