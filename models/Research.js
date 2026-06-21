const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  citations: [{
    title: { type: String },
    source: { type: String },
    url: { type: String },
    snippet: { type: String },
  }],
  mindMap: {
    nodes: [{
      id: { type: String },
      label: { type: String },
      type: { type: String, enum: ['core', 'primary', 'secondary'], default: 'secondary' },
    }],
    edges: [{
      from: { type: String },
      to: { type: String },
    }],
  },
  timestamp: { type: Date, default: Date.now },
});

const researchSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true, trim: true },
  query: { type: String, required: true },
  messages: [messageSchema],
  tags: [{ type: String, trim: true }],
  isSaved: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Research', researchSchema);
