const mongoose = require('mongoose');

const builderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true, trim: true },
  prompt: { type: String, required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: { type: String },
    timestamp: { type: Date, default: Date.now },
  }],
  generatedFiles: [{
    name: { type: String },
    path: { type: String },
    content: { type: String },
    language: { type: String },
  }],
  hasZip: { type: Boolean, default: false },
  zipPath: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Builder', builderSchema);
