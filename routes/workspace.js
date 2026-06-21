// workspace.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Workspace = require('../models/Workspace');

const ICONS = ['layers', 'cpu', 'globe', 'book', 'flask', 'chart', 'code', 'heart', 'star', 'zap', 'shield', 'users'];

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    res.render('dashboard/workspaces', {
      title: 'Workspaces — Axiom Cloud',
      workspaces, icons: ICONS, activeSection: 'workspace',
    });
  } catch (err) {
    console.error('Workspaces load error:', err);
    res.render('dashboard/workspaces', {
      title: 'Workspaces — Axiom Cloud',
      workspaces: [], icons: ICONS, activeSection: 'workspace',
    });
  }
});

router.post('/create', requireAuth, async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name?.trim()) return res.json({ success: false, message: 'Workspace name is required.' });
    const workspace = await Workspace.create({
      user: req.user._id,
      name: name.trim().slice(0, 60),
      description: (description || '').trim().slice(0, 200),
      icon: ICONS.includes(icon) ? icon : 'layers',
    });
    res.json({ success: true, workspace });
  } catch (err) {
    res.json({ success: false, message: 'Could not create workspace. Please try again.' });
  }
});

router.patch('/rename/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    await Workspace.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { name: name.trim().slice(0, 60) });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Could not rename workspace.' });
  }
});

router.patch('/archive/:id', requireAuth, async (req, res) => {
  try {
    await Workspace.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isArchived: true });
    res.json({ success: true });
  } catch (err) {
    console.error('Workspace archive error:', err);
    res.json({ success: false, message: 'Could not archive workspace. Please try again.' });
  }
});

router.delete('/delete/:id', requireAuth, async (req, res) => {
  try {
    await Workspace.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('Workspace delete error:', err);
    res.json({ success: false, message: 'Could not delete workspace. Please try again.' });
  }
});

module.exports = router;
