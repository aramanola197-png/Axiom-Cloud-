const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  googleId: { type: String, sparse: true },
  username: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false, minlength: 8 },
  avatar: { type: String, default: null },
  bio: { type: String, maxlength: 300, default: '' },
  timezone: { type: String, default: 'UTC' },
  authMethod: { type: String, enum: ['local', 'google'], default: 'local' },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String, select: false },
  verificationExpires: { type: Date, select: false },
  notifications: {
    email: { type: Boolean, default: true },
    research: { type: Boolean, default: true },
    builder: { type: Boolean, default: true },
    boardroom: { type: Boolean, default: true },
  },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Get initials for avatar fallback
userSchema.virtual('initials').get(function () {
  return this.username.slice(0, 2).toUpperCase();
});

module.exports = mongoose.model('User', userSchema);
