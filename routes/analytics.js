// analytics.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Research = require('../models/Research');
const Builder = require('../models/Builder');
const Boardroom = require('../models/Boardroom');
const Tutor = require('../models/Tutor');
const Workspace = require('../models/Workspace');

router.get('/', requireAuth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [research, builds, boardrooms, tutorSessions, workspaces] = await Promise.all([
      Research.find({ user: req.user._id, createdAt: { $gte: thirtyDaysAgo } }).select('createdAt'),
      Builder.find({ user: req.user._id, createdAt: { $gte: thirtyDaysAgo } }).select('createdAt'),
      Boardroom.find({ user: req.user._id, createdAt: { $gte: thirtyDaysAgo } }).select('createdAt'),
      Tutor.find({ user: req.user._id, createdAt: { $gte: thirtyDaysAgo } }).select('createdAt'),
      Workspace.find({ user: req.user._id, isArchived: false }).select('name stats createdAt'),
    ]);
    res.render('dashboard/analytics', {
      title: 'Analytics — Axiom Cloud',
      activeSection: 'analytics',
      stats: {
        research: research.length,
        builds: builds.length,
        boardrooms: boardrooms.length,
        tutorSessions: tutorSessions.length,
        workspaces: workspaces.length,
      },
      workspaces,
      activityData: JSON.stringify({
        research: research.map(r => r.createdAt),
        builds: builds.map(b => b.createdAt),
        boardrooms: boardrooms.map(b => b.createdAt),
        tutorSessions: tutorSessions.map(t => t.createdAt),
      }),
    });
  } catch (err) {
    res.render('dashboard/analytics', {
      title: 'Analytics — Axiom Cloud', activeSection: 'analytics',
      stats: { research: 0, builds: 0, boardrooms: 0, tutorSessions: 0, workspaces: 0 },
      workspaces: [], activityData: '{}',
    });
  }
});

module.exports = router;
