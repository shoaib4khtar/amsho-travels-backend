// ══════════════════════════════════════════════
// TICKET CONTROLLER — CRUD + Export
// ══════════════════════════════════════════════

const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');
const { sendWhatsAppMessage } = require('../utils/whatsapp');
const { generatePDF }         = require('../utils/pdf');

// ── POST /api/tickets ─────────────────────────
// Protected (Staff or Admin) — Create a new ticket
const createTicket = async (req, res, next) => {
  try {
    const { name, phone, from, to, travelDate, price } = req.body;

    // Validate required fields
    if (!name || !phone || !from || !to || !travelDate || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, phone, from, to, travelDate, price.',
      });
    }

    // Create ticket with reference to the user who created it
    const ticket = await Ticket.create({
      name,
      phone,
      from,
      to,
      travelDate,
      price,
      createdBy: req.user._id,
    });

    // Trigger WhatsApp notification (mock)
    const waResult = sendWhatsAppMessage(ticket);

    // Generate PDF (mock)
    const pdfResult = generatePDF(ticket);

    logger.success(`Ticket created: ${ticket.ticketId} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully.',
      data: {
        ticket,
        whatsapp: waResult,
        pdf: pdfResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/tickets ──────────────────────────
// Protected (Admin) — Get all tickets with optional filters
const getAllTickets = async (req, res, next) => {
  try {
    const { search, date, from, to, page = 1, limit = 50, sort = '-createdAt' } = req.query;

    // Build filter object
    const filter = {};

    // Search by name or phone
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search } },
      ];
    }

    // Filter by travel date
    if (date) {
      const start = new Date(date);
      const end   = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.travelDate = { $gte: start, $lt: end };
    }

    // Filter by route
    if (from) filter.from = { $regex: from, $options: 'i' };
    if (to)   filter.to   = { $regex: to, $options: 'i' };

    // Pagination
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Ticket.countDocuments(filter);

    // Query with populate
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/tickets/today ────────────────────
// Protected (Admin) — Get today's stats
const getTodayStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayFilter = { createdAt: { $gte: todayStart, $lte: todayEnd } };

    const totalCustomers = await Ticket.countDocuments();
    const todayTickets   = await Ticket.countDocuments(todayFilter);
    const todayRevenue   = await Ticket.aggregate([
      { $match: todayFilter },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        todayTickets,
        todayRevenue: todayRevenue.length > 0 ? todayRevenue[0].total : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/tickets/:id ──────────────────────
// Protected — Get single ticket by ID or ticketId
const getTicketById = async (req, res, next) => {
  try {
    // Try finding by MongoDB _id or custom ticketId
    let ticket = await Ticket.findById(req.params.id).populate('createdBy', 'name email');

    if (!ticket) {
      ticket = await Ticket.findOne({ ticketId: req.params.id }).populate('createdBy', 'name email');
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/tickets/:id ───────────────────
// Protected (Admin) — Delete a ticket
const deleteTicket = async (req, res, next) => {
  try {
    let ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      ticket = await Ticket.findOne({ ticketId: req.params.id });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.',
      });
    }

    await Ticket.findByIdAndDelete(ticket._id);

    logger.info(`Ticket deleted: ${ticket.ticketId} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Ticket deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/export ───────────────────────────
// Protected (Admin) — Export all tickets as CSV
const exportTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    if (!tickets.length) {
      return res.status(404).json({
        success: false,
        message: 'No tickets to export.',
      });
    }

    // Transform data for CSV
    const csvData = tickets.map((t) => ({
      'Ticket ID': t.ticketId,
      'Customer Name': t.name,
      'Phone': t.phone,
      'From': t.from,
      'To': t.to,
      'Travel Date': new Date(t.travelDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      'Price (₹)': t.price,
      'Booked By': t.createdBy ? t.createdBy.name : 'Unknown',
      'Booking Date': new Date(t.createdAt).toLocaleString('en-IN'),
    }));

    // Convert to CSV using json2csv
    const { Parser } = require('json2csv');
    const parser = new Parser({
      fields: Object.keys(csvData[0]),
      withBOM: true, // UTF-8 BOM for Excel compatibility
    });
    const csv = parser.parse(csvData);

    // Set headers for file download
    const filename = `AmshoTravels_Export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    logger.info(`CSV exported: ${tickets.length} tickets by ${req.user.email}`);

    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getTodayStats,
  getTicketById,
  deleteTicket,
  exportTickets,
};
