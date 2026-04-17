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
    const { search, date, from, to, fromDate, toDate, page = 1, limit = 50, sort = '-createdAt' } = req.query;

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

    // Filter by createdAt date range
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate + 'T00:00:00.000Z');
      if (toDate)   filter.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
    }

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
// Protected (Admin) — Get today's stats (single aggregation)
const getTodayStats = async (req, res, next) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const result = await Ticket.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: {
          _id: null,
          todayTickets: { $sum: 1 },
          todayRevenue: { $sum: '$price' },
          uniquePhones: { $addToSet: '$phone' },
      }},
      { $project: {
          _id: 0,
          todayTickets: 1,
          todayRevenue: 1,
          totalCustomers: { $size: '$uniquePhones' },
      }},
    ]);

    const stats = result.length > 0 ? result[0] : { totalCustomers: 0, todayTickets: 0, todayRevenue: 0 };

    res.status(200).json({
      success: true,
      data: stats,
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

// ── GET /api/tickets/export ───────────────────
// Protected (Admin) — Export tickets as CSV (respects filters)
const exportTickets = async (req, res, next) => {
  try {
    const { fromDate, toDate, search } = req.query;
    const filter = {};

    // Apply date range filter on createdAt
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate + 'T00:00:00.000Z');
      if (toDate)   filter.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
    }

    // Apply search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search } },
      ];
    }

    const tickets = await Ticket.find(filter)
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
      'Name': t.name,
      'Phone': t.phone,
      'From': t.from,
      'To': t.to,
      'Travel Date': new Date(t.travelDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      'Ticket Price (₹)': t.price,
      'Created At': new Date(t.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
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

// ── GET /api/tickets/reports ──────────────────
// Protected (Admin) — Reports summary + paginated data
const getReportStats = async (req, res, next) => {
  try {
    const { fromDate, toDate, page = 1, limit = 50 } = req.query;
    const filter = {};

    // Apply date range filter on createdAt
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate + 'T00:00:00.000Z');
      if (toDate)   filter.createdAt.$lte = new Date(toDate + 'T23:59:59.999Z');
    }

    // Summary via aggregation (single pipeline)
    const summaryPipeline = [
      ...(Object.keys(filter).length ? [{ $match: filter }] : []),
      { $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          uniquePhones: { $addToSet: '$phone' },
      }},
      { $project: {
          _id: 0,
          totalTickets: 1,
          totalRevenue: 1,
          totalCustomers: { $size: '$uniquePhones' },
      }},
    ];

    const summaryResult = await Ticket.aggregate(summaryPipeline);
    const summary = summaryResult.length > 0
      ? summaryResult[0]
      : { totalCustomers: 0, totalTickets: 0, totalRevenue: 0 };

    // Paginated data
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('name phone from to travelDate price createdAt');

    res.status(200).json({
      success: true,
      data: {
        summary,
        tickets,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
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
  getReportStats,
};
