const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Research = require('../models/Research');
const Workspace = require('../models/Workspace');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');

const RESEARCH_SYSTEM = `You are Axiom Cloud's Research Intelligence — a world-class AI research analyst.
Your role is to provide comprehensive, accurate, and insightful research on any topic the user asks about.

Structure your written answer using markdown:
- Use ## for section headings
- Use **bold** for key terms
- Use bullet lists for multiple items
- Include sections like Overview, Market Analysis, Key Trends, Competitors, Opportunities, and Risks where relevant
- Be analytical, not just descriptive

Your tone is calm, intelligent, and precise. No excessive enthusiasm, no emojis.`;

function buildStructuredPrompt(query) {
  return `Research this topic: "${query}"

Respond with ONLY valid JSON in this exact shape, no markdown fences, no commentary outside the JSON:
{
  "answer": "Full markdown-formatted research answer here, following the system instructions on structure and tone.",
  "citations": [
    { "title": "Source name", "source": "Publisher or site", "url": "https://example.com", "snippet": "One sentence describing what this source supports." }
  ],
  "mindMap": {
    "nodes": [
      { "id": "core", "label": "${query.slice(0, 30)}", "type": "core" },
      { "id": "n1", "label": "Related concept", "type": "primary" },
      { "id": "n2", "label": "Sub concept", "type": "secondary" }
    ],
    "edges": [
      { "from": "core", "to": "n1" },
      { "from": "n1", "to": "n2" }
    ]
  }
}

Provide 3-6 citations (real, credible sources where possible — if uncertain of exact URL, use the organization's known domain). Provide 6-10 mind map nodes connected logically from a single "core" node outward through "primary" and "secondary" nodes. Keep node labels under 4 words.`;
}

function sanitizeCitationUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    return '#';
  } catch (e) {
    return '#';
  }
}

function parseStructured(raw) {
  const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed.citations)) {
      parsed.citations = parsed.citations.map(c => ({ ...c, url: sanitizeCitationUrl(c.url) }));
    }
    return parsed;
  } catch (err) {
    // Fallback: treat whole thing as plain answer text if JSON parsing fails
    return { answer: raw, citations: [], mindMap: { nodes: [], edges: [] } };
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Research.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(20);
    const activeWorkspace = workspaces[0] || null;
    res.render('dashboard/research', {
      title: 'Research Studio — Axiom Cloud',
      workspaces, sessions, activeWorkspace,
      currentSession: null, activeSection: 'research',
    });
  } catch (err) {
    console.error('Research Studio load error:', err);
    res.render('dashboard/research', {
      title: 'Research Studio — Axiom Cloud',
      workspaces: [], sessions: [], activeWorkspace: null,
      currentSession: null, activeSection: 'research',
    });
  }
});

router.get('/session/:id', requireAuth, async (req, res) => {
  try {
    const session = await Research.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.redirect('/research');
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Research.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(20);
    const activeWorkspace = workspaces.find(w => w._id.toString() === session.workspace.toString()) || workspaces[0];
    res.render('dashboard/research', {
      title: `${session.title} — Research Studio`,
      workspaces, sessions, activeWorkspace,
      currentSession: session, activeSection: 'research',
    });
  } catch (err) {
    console.error('Research session load error:', err);
    res.redirect('/research');
  }
});

router.post('/start', requireAuth, async (req, res) => {
  try {
    const { query, workspaceId } = req.body;
    if (!query?.trim()) return res.json({ success: false, message: 'Please enter a research topic.' });

    let workspace = await Workspace.findOne({ _id: workspaceId, user: req.user._id });
    if (!workspace) {
      workspace = await Workspace.findOne({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    }
    if (!workspace) return res.json({ success: false, message: 'No workspace found. Please create one first.' });

    const raw = await aiService.research(buildStructuredPrompt(query), RESEARCH_SYSTEM);
    const structured = parseStructured(raw);

    const session = await Research.create({
      user: req.user._id,
      workspace: workspace._id,
      title: query.slice(0, 60) + (query.length > 60 ? '...' : ''),
      query,
      messages: [
        { role: 'user', content: query },
        {
          role: 'assistant',
          content: structured.answer,
          citations: structured.citations || [],
          mindMap: structured.mindMap || { nodes: [], edges: [] },
        },
      ],
    });

    await Workspace.findByIdAndUpdate(workspace._id, {
      $inc: { 'stats.researches': 1 },
      lastActivity: new Date(),
    });

    res.json({
      success: true,
      sessionId: session._id,
      response: structured.answer,
      citations: structured.citations || [],
      mindMap: structured.mindMap || { nodes: [], edges: [] },
    });
  } catch (err) {
    console.error('Research start error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'Our research system encountered an issue. Please try again.') });
  }
});

router.post('/message/:id', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const session = await Research.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false, message: 'Session not found.' });

    const raw = await aiService.research(buildStructuredPrompt(message), RESEARCH_SYSTEM);
    const structured = parseStructured(raw);

    session.messages.push({ role: 'user', content: message });
    session.messages.push({
      role: 'assistant',
      content: structured.answer,
      citations: structured.citations || [],
      mindMap: structured.mindMap || { nodes: [], edges: [] },
    });
    session.updatedAt = new Date();
    await session.save();

    res.json({
      success: true,
      response: structured.answer,
      citations: structured.citations || [],
      mindMap: structured.mindMap || { nodes: [], edges: [] },
    });
  } catch (err) {
    console.error('Research message error:', err);
    res.json({ success: false, message: aiErrorMessage(err) });
  }
});

router.delete('/session/:id', requireAuth, async (req, res) => {
  try {
    await Research.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) {
    console.error('Research session delete error:', err);
    res.json({ success: false, message: 'Could not delete this session. Please try again.' });
  }
});

module.exports = router;
