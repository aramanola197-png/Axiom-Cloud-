const mongoose = require('mongoose');

const boardroomSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true },
  pitch: { type: String, required: true },
  messages: [{
    speaker: { type: String, enum: ['user', 'investor', 'cto', 'pm'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
  verdict: {
    strengths: [String],
    weaknesses: [String],
    risks: [String],
    opportunities: [String],
    recommendations: [String],
    score: { type: Number, min: 0, max: 10 },
  },
  isComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Boardroom', boardroomSchema);
