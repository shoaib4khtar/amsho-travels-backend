// ══════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  login,
  register,
  getProfile,
  getStaff,
  deleteStaff,
} = require('../controllers/authController');

// ── Public routes ─────────────────────────────
router.post('/login', login);

// ── Protected routes ──────────────────────────
router.get('/profile', verifyToken, getProfile);

// ── Admin-only routes ─────────────────────────
router.post('/register', verifyToken, isAdmin, register);
router.get('/staff', verifyToken, isAdmin, getStaff);
router.delete('/staff/:id', verifyToken, isAdmin, deleteStaff);

module.exports = router;
