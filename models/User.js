// ══════════════════════════════════════════════
// USER MODEL — Admin & Staff accounts
// ══════════════════════════════════════════════

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [4, 'Password must be at least 4 characters'],
    select: false, // Never return password in queries by default
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

// ── Pre-save hook: hash password before storing ──
userSchema.pre('save', async function (next) {
  // Only hash if password was modified (not on every save)
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare entered password with hash ──
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Transform JSON output: remove password from responses ──
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
