const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentId: { type: String, required: true }, // matches AGENTS catalog id in routes/marketplace.js
  installedAt: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: null },
});

agentSchema.index({ user: 1, agentId: 1 }, { unique: true });

module.exports = mongoose.model('InstalledAgent', agentSchema);
