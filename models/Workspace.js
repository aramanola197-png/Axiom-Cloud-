const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  joinedAt: { type: Date, default: Date.now },
});

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  token: { type: String, required: true },
  role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

const workspaceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // original creator/owner
  name: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, maxlength: 200, default: '' },
  icon: { type: String, default: 'layers' },
  isDefault: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  members: [memberSchema],
  pendingInvites: [inviteSchema],
  stats: {
    researches: { type: Number, default: 0 },
    builds: { type: Number, default: 0 },
    tutorSessions: { type: Number, default: 0 },
    boardroomSessions: { type: Number, default: 0 },
    deployments: { type: Number, default: 0 },
  },
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Workspace', workspaceSchema);
