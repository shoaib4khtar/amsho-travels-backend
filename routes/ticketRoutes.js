// ══════════════════════════════════════════════
// TICKET ROUTES
// ══════════════════════════════════════════════

const express = require('express');
const router  = express.Router();
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth');
const {
  createTicket,
  getAllTickets,
  getTodayStats,
  getTicketById,
  deleteTicket,
  exportTickets,
  getReportStats,
} = require('../controllers/ticketController');

// ── Staff + Admin routes ──────────────────────
router.post('/', verifyToken, isStaff, createTicket);

// ── Admin-only routes ─────────────────────────
router.get('/', verifyToken, isAdmin, getAllTickets);
router.get('/today', verifyToken, isAdmin, getTodayStats);
router.get('/export', verifyToken, isAdmin, exportTickets);
router.get('/reports', verifyToken, isAdmin, getReportStats);
router.get('/:id', verifyToken, isStaff, getTicketById);
router.delete('/:id', verifyToken, isAdmin, deleteTicket);

module.exports = router;
