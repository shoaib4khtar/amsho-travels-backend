// ══════════════════════════════════════════════
// WHATSAPP MOCK UTILITY
// ══════════════════════════════════════════════

/**
 * Simulates sending a WhatsApp message to the customer
 * after a ticket is created.
 *
 * In production, replace this with an actual WhatsApp Business
 * API integration (e.g., Twilio, WATI, or Meta Cloud API).
 *
 * @param {Object} ticket - The ticket document from MongoDB
 */
function sendWhatsAppMessage(ticket) {
  const travelDate = new Date(ticket.travelDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const message = `
🎫 *Bajrang Express — Booking Confirmed*

👤 *Name:* ${ticket.name}
📞 *Phone:* ${ticket.phone}
🛣️ *Route:* ${ticket.from} → ${ticket.to}
📅 *Date:* ${travelDate}
💰 *Amount:* ₹${Number(ticket.price).toLocaleString('en-IN')}
🆔 *Ticket:* ${ticket.ticketId}

Thank you for choosing Bajrang Express!
Have a safe journey 🙏
  `.trim();

  // ── Mock: Log to console ──
  console.log('──────────────────────────────────────');
  console.log('📲 [WhatsApp Mock] Message sent to:', ticket.phone);
  console.log('──────────────────────────────────────');
  console.log(message);
  console.log('──────────────────────────────────────');

  // ── Production placeholder ──
  // const waPhone = ticket.phone.length === 10 ? '91' + ticket.phone : ticket.phone;
  // await whatsappClient.send(waPhone, message);

  return {
    success: true,
    to: ticket.phone,
    message,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { sendWhatsAppMessage };
