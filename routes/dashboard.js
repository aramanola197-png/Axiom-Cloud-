const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const Research = require('../models/Research');
const Builder = require('../models/Builder');
const Boardroom = require('../models/Boardroom');
const Tutor = require('../models/Tutor');

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false })
      .sort({ lastActivity: -1 }).limit(6);

    const recentResearch = await Research.find({ user: req.user._id })
      .sort({ updatedAt: -1 }).limit(4);

    const recentBuilds = await Builder.find({ user: req.user._id })
      .sort({ updatedAt: -1 }).limit(4);

    const recentBoardroom = await Boardroom.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(3);

    const recentTutor = await Tutor.find({ user: req.user._id })
      .sort({ updatedAt: -1 }).limit(3);

    const stats = {
      workspaces: await Workspace.countDocuments({ user: req.user._id, isArchived: false }),
      researches: await Research.countDocuments({ user: req.user._id }),
      builds: await Builder.countDocuments({ user: req.user._id }),
      boardrooms: await Boardroom.countDocuments({ user: req.user._id }),
      tutorSessions: await Tutor.countDocuments({ user: req.user._id }),
    };

    res.render('dashboard/index', {
      title: 'Dashboard — Axiom Cloud',
      workspaces,
      recentResearch,
      recentBuilds,
      recentBoardroom,
      recentTutor,
      stats,
      welcome: req.query.welcome === '1',
      activeSection: 'dashboard',
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('dashboard/index', {
      title: 'Dashboard — Axiom Cloud',
      workspaces: [], recentResearch: [], recentBuilds: [],
      recentBoardroom: [], recentTutor: [],
      stats: { workspaces: 0, researches: 0, builds: 0, boardrooms: 0, tutorSessions: 0 },
      welcome: false, activeSection: 'dashboard',
    });
  }
});

module.exports = router;
