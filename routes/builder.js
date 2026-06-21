const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Builder = require('../models/Builder');
const Workspace = require('../models/Workspace');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const BUILDER_SYSTEM = `You are Axiom Cloud's AI Builder — a senior software architect and full-stack engineer.
Your role is to help users design and architect complete, production-ready projects.

When a user describes what they want to build, provide:
1. **Project Overview** — What it is, who it's for, core value proposition
2. **Architecture** — High-level system design, components, and how they connect
3. **Tech Stack Recommendations** — Frontend, backend, database, APIs, hosting
4. **Core Features** — Prioritized feature list (MVP first, then v2)
5. **Frontend Structure** — Pages, components, user flows
6. **Backend Structure** — API endpoints, authentication, data models
7. **Database Design** — Collections/tables, relationships, indexes
8. **Deployment Guide** — How to set it up, run it, and deploy it

Format everything with clear markdown sections.
Be specific, practical, and production-minded.
Think about scalability, security, and user experience in every recommendation.
Never suggest building something that cannot realistically be built.`;

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Builder.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(20);
    res.render('dashboard/builder', {
      title: 'AI Builder — Axiom Cloud',
      workspaces, sessions, currentSession: null, activeSection: 'builder',
    });
  } catch (err) {
    console.error('Builder load error:', err);
    res.render('dashboard/builder', {
      title: 'AI Builder — Axiom Cloud',
      workspaces: [], sessions: [], currentSession: null, activeSection: 'builder',
    });
  }
});

router.get('/session/:id', requireAuth, async (req, res) => {
  try {
    const session = await Builder.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.redirect('/builder');
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Builder.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(20);
    res.render('dashboard/builder', {
      title: `${session.title} — AI Builder`,
      workspaces, sessions, currentSession: session, activeSection: 'builder',
    });
  } catch (err) {
    console.error('Builder session load error:', err);
    res.redirect('/builder');
  }
});

router.post('/start', requireAuth, async (req, res) => {
  try {
    const { prompt, workspaceId } = req.body;
    if (!prompt?.trim()) return res.json({ success: false, message: 'Please describe what you want to build.' });

    let workspace = await Workspace.findOne({ _id: workspaceId, user: req.user._id });
    if (!workspace) workspace = await Workspace.findOne({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });

    const aiResponse = await aiService.chat([], prompt, BUILDER_SYSTEM, process.env.BUILDER_MODEL || null);

    const session = await Builder.create({
      user: req.user._id,
      workspace: workspace._id,
      title: prompt.slice(0, 60) + (prompt.length > 60 ? '...' : ''),
      prompt,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: aiResponse },
      ],
    });

    await Workspace.findByIdAndUpdate(workspace._id, {
      $inc: { 'stats.builds': 1 },
      lastActivity: new Date(),
    });

    res.json({ success: true, sessionId: session._id, response: aiResponse });
  } catch (err) {
    console.error('Builder start error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'The Builder encountered an issue. Please try again.') });
  }
});

router.post('/message/:id', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const session = await Builder.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false, message: 'Session not found.' });

    const aiResponse = await aiService.chat(session.messages, message, BUILDER_SYSTEM, process.env.BUILDER_MODEL || null);
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: aiResponse });
    session.updatedAt = new Date();
    await session.save();

    res.json({ success: true, response: aiResponse });
  } catch (err) {
    res.json({ success: false, message: aiErrorMessage(err) });
  }
});

router.post('/generate-zip/:id', requireAuth, async (req, res) => {
  try {
    const session = await Builder.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false, message: 'Session not found.' });

    const zipPrompt = `Based on this project discussion:
${session.messages.map(m => `${m.role === 'user' ? 'User' : 'Builder'}: ${m.content}`).join('\n\n')}

Generate a complete, ready-to-run project. Return ONLY valid JSON in this exact format:
{
  "projectName": "my-project",
  "files": [
    { "path": "README.md", "content": "# Project\\n..." },
    { "path": "package.json", "content": "{...}" },
    { "path": "server.js", "content": "..." },
    { "path": ".env.example", "content": "PORT=3000\\nDB_URI=..." }
  ]
}

Include all necessary files for a working project. The .env.example must explain every variable.
README.md must have clear setup and deployment instructions in plain language.`;

    const raw = await aiService.complete(zipPrompt, null, process.env.BUILDER_MODEL || null);
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
    const projectData = JSON.parse(clean);

    // Create ZIP
    const zipDir = path.join(__dirname, '../public/downloads');
    if (!fs.existsSync(zipDir)) fs.mkdirSync(zipDir, { recursive: true });

    const zipName = `${projectData.projectName}-axiom-${Date.now()}.zip`;
    const zipPath = path.join(zipDir, zipName);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      for (const file of projectData.files) {
        archive.append(file.content, { name: `${projectData.projectName}/${file.path}` });
      }
      archive.finalize();
    });

    session.hasZip = true;
    session.zipPath = `/downloads/${zipName}`;
    await session.save();

    res.json({ success: true, downloadUrl: `/downloads/${zipName}`, projectName: projectData.projectName });
  } catch (err) {
    console.error('ZIP generation error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'Could not generate project files. Please try again.') });
  }
});

module.exports = router;
