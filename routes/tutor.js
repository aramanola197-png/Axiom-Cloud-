const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Tutor = require('../models/Tutor');
const Workspace = require('../models/Workspace');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');

const TUTOR_SYSTEM = `You are Axiom Cloud's AI Tutor — a world-class educator and mentor.
Your role is to teach users anything they want to learn, adapting your style and depth to match their understanding.

Teaching principles:
- Start with a clear, simple explanation before diving into complexity
- Use real-world examples and analogies that connect to things people already understand
- Break complex topics into digestible sections
- Include practical exercises or reflection questions when helpful
- Use markdown for structure: ## headings, **bold key terms**, code blocks for technical content
- When explaining code or technical systems, always explain WHY not just HOW
- Be patient, encouraging, and never condescending
- If a user seems confused, reframe the explanation from a different angle

Your tone is warm, precise, and intellectually engaged. You are genuinely excited to share knowledge.
You never shame users for not knowing something. Every question is a good question.`;

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Tutor.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(20);
    res.render('dashboard/tutor', {
      title: 'AI Tutor — Axiom Cloud',
      workspaces, sessions, currentSession: null, activeSection: 'tutor',
    });
  } catch (err) {
    console.error('Tutor load error:', err);
    res.render('dashboard/tutor', {
      title: 'AI Tutor — Axiom Cloud',
      workspaces: [], sessions: [], currentSession: null, activeSection: 'tutor',
    });
  }
});

router.get('/session/:id', requireAuth, async (req, res) => {
  try {
    const session = await Tutor.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.redirect('/tutor');
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Tutor.find({ user: req.user._id }).sort({ updatedAt: -1 }).limit(20);
    res.render('dashboard/tutor', {
      title: `${session.title} — AI Tutor`,
      workspaces, sessions, currentSession: session, activeSection: 'tutor',
    });
  } catch (err) {
    console.error('Tutor session load error:', err);
    res.redirect('/tutor');
  }
});

router.post('/start', requireAuth, async (req, res) => {
  try {
    const { topic, workspaceId } = req.body;
    if (!topic?.trim()) return res.json({ success: false, message: 'Please enter a topic to learn.' });

    let workspace = await Workspace.findOne({ _id: workspaceId, user: req.user._id });
    if (!workspace) workspace = await Workspace.findOne({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });

    const aiResponse = await aiService.chat([], `Teach me about: ${topic}`, TUTOR_SYSTEM, process.env.TUTOR_MODEL || null);

    const session = await Tutor.create({
      user: req.user._id,
      workspace: workspace._id,
      title: topic.slice(0, 60),
      topic,
      messages: [
        { role: 'user', content: `Teach me about: ${topic}` },
        { role: 'assistant', content: aiResponse },
      ],
    });

    await Workspace.findByIdAndUpdate(workspace._id, {
      $inc: { 'stats.tutorSessions': 1 },
      lastActivity: new Date(),
    });

    res.json({ success: true, sessionId: session._id, response: aiResponse });
  } catch (err) {
    console.error('Tutor start error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'The Tutor is unavailable right now. Please try again.') });
  }
});

router.post('/message/:id', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const session = await Tutor.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false, message: 'Session not found.' });

    const aiResponse = await aiService.chat(session.messages, message, TUTOR_SYSTEM, process.env.TUTOR_MODEL || null);
    session.messages.push({ role: 'user', content: message });
    session.messages.push({ role: 'assistant', content: aiResponse });
    session.updatedAt = new Date();
    await session.save();

    res.json({ success: true, response: aiResponse });
  } catch (err) {
    res.json({ success: false, message: aiErrorMessage(err) });
  }
});

router.post('/quiz/:id', requireAuth, async (req, res) => {
  try {
    const session = await Tutor.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false, message: 'Session not found.' });

    const recentContext = session.messages.slice(-6).map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n\n');

    const quizPrompt = `Based on this tutoring conversation about "${session.topic}":

${recentContext}

Generate a short quiz of exactly 3 multiple-choice questions to test understanding of what was just taught.
Respond with ONLY valid JSON, no markdown fences, in this exact shape:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of why this is correct."
  }
]
Make questions specific to what was actually discussed, not generic. correctIndex is zero-based.`;

    const raw = await aiService.generateQuiz(quizPrompt);
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
    const quiz = JSON.parse(clean);

    session.messages.push({ role: 'assistant', content: 'Here is a quick quiz to check your understanding:', quiz });
    session.updatedAt = new Date();
    await session.save();

    res.json({ success: true, quiz });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'Could not generate a quiz right now. Please try again.') });
  }
});

module.exports = router;
