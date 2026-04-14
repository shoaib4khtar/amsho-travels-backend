// ══════════════════════════════════════════════
// PDF GENERATION UTILITY (Structure)
// ══════════════════════════════════════════════

/**
 * Generates a PDF ticket receipt.
 *
 * In production, use a library like:
 * - pdfkit (server-side PDF generation)
 * - puppeteer (HTML-to-PDF rendering)
 * - jsPDF (if generating from frontend)
 *
 * @param {Object} ticket - The ticket document from MongoDB
 * @returns {Object} - PDF generation result
 */
function generatePDF(ticket) {
  const travelDate = new Date(ticket.travelDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const pdfData = {
    ticketId: ticket.ticketId,
    header: 'Amsho Travels',
    subheader: 'Reliable · Comfortable · Safe',
    fields: {
      Name: ticket.name,
      Phone: ticket.phone,
      Route: `${ticket.from} → ${ticket.to}`,
      Date: travelDate,
      Amount: `₹${Number(ticket.price).toLocaleString('en-IN')}`,
    },
    footer: 'Thank you for booking! Have a safe journey 🙏',
  };

  // ── Mock: Log to console ──
  console.log('📄 [PDF Mock] Generated for ticket:', ticket.ticketId);

  // ── Production placeholder ──
  // const PDFDocument = require('pdfkit');
  // const doc = new PDFDocument({ size: [164, 340] }); // 58mm width
  // ... render receipt layout ...
  // return doc;

  return {
    success: true,
    ticketId: ticket.ticketId,
    filename: `Amsho_Ticket_${ticket.ticketId}.pdf`,
    data: pdfData,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { generatePDF };
