const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const DatabaseStudio = require('../models/DatabaseStudio');
const Workspace = require('../models/Workspace');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const databases = await DatabaseStudio.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.render('dashboard/database-studio', {
      title: 'Database Studio — Axiom Cloud',
      workspaces, databases, activeSection: 'database',
    });
  } catch (err) {
    console.error('Database Studio load error:', err);
    res.render('dashboard/database-studio', {
      title: 'Database Studio — Axiom Cloud',
      workspaces: [], databases: [], activeSection: 'database',
    });
  }
});

router.post('/create', requireAuth, async (req, res) => {
  try {
    const { name, workspaceId } = req.body;
    let workspace = await Workspace.findOne({ _id: workspaceId, user: req.user._id });
    if (!workspace) workspace = await Workspace.findOne({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    if (!workspace) return res.json({ success: false, message: 'No workspace found.' });

    const db = await DatabaseStudio.create({
      user: req.user._id,
      workspace: workspace._id,
      name: name?.trim() || 'My Database',
      tables: [],
    });
    res.json({ success: true, database: db });
  } catch (err) {
    res.json({ success: false, message: 'Could not create database.' });
  }
});

router.post('/generate/:id', requireAuth, async (req, res) => {
  try {
    const { description } = req.body;
    const db = await DatabaseStudio.findOne({ _id: req.params.id, user: req.user._id });
    if (!db) return res.json({ success: false, message: 'Database not found.' });
    if (!description?.trim()) return res.json({ success: false, message: 'Please describe what you want to build.' });

    const prompt = `Design a complete MongoDB-style database schema for this project: "${description}"

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "tables": [
    {
      "name": "Users",
      "fields": [
        { "name": "email", "type": "String", "required": true, "unique": true, "defaultValue": "", "refTable": "" },
        { "name": "name", "type": "String", "required": true, "unique": false, "defaultValue": "", "refTable": "" }
      ]
    }
  ]
}

Allowed field types: String, Number, Boolean, Date, ObjectId, Array.
For ObjectId fields that reference another table, set "refTable" to that table's name, e.g. a "user" field referencing "Users".
Design 3-7 tables with realistic, production-quality fields and proper relationships. Every table needs reasonable fields beyond just an id.`;

    const raw = await aiService.generateSchema(prompt);
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean);

    const cols = 3;
    const tables = parsed.tables.map((t, i) => ({
      name: t.name,
      fields: t.fields,
      position: { x: (i % cols) * 320 + 40, y: Math.floor(i / cols) * 280 + 40 },
    }));

    db.tables = tables;
    db.updatedAt = new Date();
    await db.save();

    res.json({ success: true, database: db });
  } catch (err) {
    console.error('Schema generation error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'Could not generate schema. Please try again.') });
  }
});

router.post('/:id/table', requireAuth, async (req, res) => {
  try {
    const { name, position } = req.body;
    const db = await DatabaseStudio.findOne({ _id: req.params.id, user: req.user._id });
    if (!db) return res.json({ success: false, message: 'Database not found.' });

    db.tables.push({
      name: name?.trim() || 'NewTable',
      fields: [{ name: 'name', type: 'String', required: false, unique: false }],
      position: position || { x: 40, y: 40 },
    });
    db.updatedAt = new Date();
    await db.save();
    res.json({ success: true, database: db });
  } catch (err) {
    res.json({ success: false, message: 'Could not add table.' });
  }
});

router.patch('/:id/table/:tableId', requireAuth, async (req, res) => {
  try {
    const { name, fields, position } = req.body;
    const db = await DatabaseStudio.findOne({ _id: req.params.id, user: req.user._id });
    if (!db) return res.json({ success: false, message: 'Database not found.' });

    const table = db.tables.id(req.params.tableId);
    if (!table) return res.json({ success: false, message: 'Table not found.' });

    if (name !== undefined) table.name = name;
    if (fields !== undefined) table.fields = fields;
    if (position !== undefined) table.position = position;

    db.updatedAt = new Date();
    await db.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Could not update table.' });
  }
});

router.delete('/:id/table/:tableId', requireAuth, async (req, res) => {
  try {
    const db = await DatabaseStudio.findOne({ _id: req.params.id, user: req.user._id });
    if (!db) return res.json({ success: false, message: 'Database not found.' });
    db.tables.pull({ _id: req.params.tableId });
    db.updatedAt = new Date();
    await db.save();
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Could not delete table.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await DatabaseStudio.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('Database delete error:', err);
    res.json({ success: false, message: 'Could not delete database. Please try again.' });
  }
});

module.exports = router;
