// ══════════════════════════════════════════════
// SEED SCRIPT — Create default admin account
// ══════════════════════════════════════════════
// Run once: node utils/seed.js

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose  = require('mongoose');
const User      = require('../models/User');
const connectDB = require('../config/db');

async function seed() {
  await connectDB();

  // Check if admin already exists
  const existing = await User.findOne({ email: 'admin@bajrang.com' });
  if (existing) {
    console.log('⚠️  Admin account already exists. Skipping seed.');
    process.exit(0);
  }

  // Create default admin
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@bajrang.com',
    password: '1234',
    role: 'admin',
  });

  console.log('✅ Default admin account created:');
  console.log(`   Email:    admin@bajrang.com`);
  console.log(`   Password: 1234`);
  console.log(`   ID:       ${admin._id}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
