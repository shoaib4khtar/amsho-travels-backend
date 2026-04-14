// ══════════════════════════════════════════════
// TICKET MODEL — Booking records
// ══════════════════════════════════════════════

const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\d{10}$/, 'Phone must be a 10-digit number'],
  },
  from: {
    type: String,
    required: [true, 'Departure city is required'],
    trim: true,
  },
  to: {
    type: String,
    required: [true, 'Destination city is required'],
    trim: true,
  },
  travelDate: {
    type: Date,
    required: [true, 'Travel date is required'],
  },
  price: {
    type: Number,
    required: [true, 'Ticket price is required'],
    min: [0, 'Price cannot be negative'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true, // createdAt = booking timestamp
});

// ── Pre-save hook: auto-generate ticketId ──
ticketSchema.pre('save', function (next) {
  if (!this.ticketId) {
    const d = new Date();
    this.ticketId = 'AT' +
      String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') +
      String(d.getHours()).padStart(2, '0') +
      String(d.getMinutes()).padStart(2, '0') +
      String(d.getSeconds()).padStart(2, '0') +
      String(d.getMilliseconds()).padStart(3, '0');
  }
  next();
});

// ── Indexes for common queries ──
ticketSchema.index({ phone: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ travelDate: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
