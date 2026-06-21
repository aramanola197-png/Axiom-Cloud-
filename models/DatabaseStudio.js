const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Array'], default: 'String' },
  required: { type: Boolean, default: false },
  unique: { type: Boolean, default: false },
  defaultValue: { type: String, default: '' },
  refTable: { type: String, default: '' }, // for ObjectId relations
});

const tableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fields: [fieldSchema],
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
});

const databaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true, default: 'My Database' },
  tables: [tableSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DatabaseStudio', databaseSchema);
