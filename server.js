// ══════════════════════════════════════════════════════════
// AMSHO TRAVELS — BACKEND SERVER
// ══════════════════════════════════════════════════════════
// Production-ready Express.js API server with:
// - JWT Authentication (Admin + Staff roles)
// - MongoDB Atlas via Mongoose
// - Role-based access control (RBAC)
// - Ticket management + CSV export
// - WhatsApp mock + PDF mock
// ══════════════════════════════════════════════════════════

// ── Load environment variables FIRST ──────────
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const logger       = require('./utils/logger');

// ── Import routes ─────────────────────────────
const authRoutes   = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

// ── Initialize Express app ────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ══════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// CORS — Allow frontend to call this API
app.use(cors({
  origin: '*', // In production, set this to your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// HTTP request logging (dev mode)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ══════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 Bajrang Express API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tickets: '/api/tickets',
      export: '/api/tickets/export',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

// ── 404 handler for undefined routes ──────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler (must be last) ───────
app.use(errorHandler);

// ══════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════
async function startServer() {
  // Connect to MongoDB Atlas
  await connectDB();

  // Start Express server
  app.listen(PORT, () => {
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log(`🚀  Bajrang Express API Server`);
    console.log(`    Port:        ${PORT}`);
    console.log(`    Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`    API URL:     http://localhost:${PORT}`);
    console.log('══════════════════════════════════════════════');
    console.log('');
    console.log('📌 Available Endpoints:');
    console.log('   POST   /api/auth/login         → Login');
    console.log('   POST   /api/auth/register      → Create staff (admin)');
    console.log('   GET    /api/auth/profile        → Get profile');
    console.log('   GET    /api/auth/staff          → List staff (admin)');
    console.log('   DELETE /api/auth/staff/:id      → Delete staff (admin)');
    console.log('   POST   /api/tickets             → Create ticket');
    console.log('   GET    /api/tickets             → List tickets (admin)');
    console.log('   GET    /api/tickets/today       → Today stats (admin)');
    console.log('   GET    /api/tickets/export      → Export CSV (admin)');
    console.log('   GET    /api/tickets/reports     → Reports & analytics (admin)');
    console.log('   GET    /api/tickets/:id         → Get ticket');
    console.log('   DELETE /api/tickets/:id         → Delete ticket (admin)');
    console.log('');
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app; // For testing
