const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Boardroom = require('../models/Boardroom');
const Workspace = require('../models/Workspace');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');

const PERSONALITIES = {
  investor: {
    name: 'Marcus Reid',
    role: 'Venture Investor',
    style: `You are Marcus Reid, a seasoned venture investor with 20 years of experience backing startups. 
You focus on market size, business model viability, competitive moats, revenue potential, funding requirements, and exit opportunities.
You ask hard questions about monetization, customer acquisition cost, and market timing.
You are direct, analytical, and sometimes skeptical — but always constructive.
You speak in short, punchy sentences. You occasionally challenge assumptions with data.
Never be a pushover. Push back when ideas are weak. Celebrate when they are strong.`,
  },
  cto: {
    name: 'Dr. Priya Nair',
    role: 'Chief Technology Officer',
    style: `You are Dr. Priya Nair, a veteran CTO who has built systems at scale for millions of users.
You focus on technical feasibility, architecture, scalability, security, engineering challenges, tech stack choices, and build timelines.
You ask about infrastructure, APIs, databases, and how the team plans to handle growth.
You are thorough, precise, and occasionally technical — but always translate complexity into understandable terms.
You are excited by elegant solutions and critical of over-engineering or naive technical assumptions.`,
  },
  pm: {
    name: 'James Okafor',
    role: 'Product Manager',
    style: `You are James Okafor, a product leader who has launched products used by millions.
You focus on user experience, product-market fit, feature prioritization, user journeys, and go-to-market strategy.
You ask about the target user, their pain points, how the product solves them better than alternatives, and what the MVP looks like.
You are empathetic toward users, practical about timelines, and always thinking about what ships first.
You balance vision with pragmatism.`,
  },
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Boardroom.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.render('dashboard/boardroom', {
      title: 'AI Board Room — Axiom Cloud',
      workspaces, sessions, currentSession: null, activeSection: 'boardroom',
    });
  } catch (err) {
    console.error('Boardroom load error:', err);
    res.render('dashboard/boardroom', {
      title: 'AI Board Room — Axiom Cloud',
      workspaces: [], sessions: [], currentSession: null, activeSection: 'boardroom',
    });
  }
});

router.get('/session/:id', requireAuth, async (req, res) => {
  try {
    const session = await Boardroom.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.redirect('/boardroom');
    const workspaces = await Workspace.find({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    const sessions = await Boardroom.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.render('dashboard/boardroom', {
      title: `${session.title} — Board Room`,
      workspaces, sessions, currentSession: session, activeSection: 'boardroom',
    });
  } catch (err) {
    console.error('Boardroom session load error:', err);
    res.redirect('/boardroom');
  }
});

router.post('/pitch', requireAuth, async (req, res) => {
  try {
    const { pitch, workspaceId } = req.body;
    if (!pitch?.trim()) return res.json({ success: false, message: 'Please describe your idea.' });

    let workspace = await Workspace.findOne({ _id: workspaceId, user: req.user._id });
    if (!workspace) {
      workspace = await Workspace.findOne({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    }

    // Get opening responses from all 3 personalities
    const responses = await Promise.all(
      Object.entries(PERSONALITIES).map(async ([key, p]) => {
        const prompt = `${p.style}\n\nThe user has pitched the following idea:\n"${pitch}"\n\nGive your initial reaction in 3-5 sentences. Be specific to this idea. Start with your perspective.`;
        const response = await aiService.complete(prompt, null, process.env.BOARDROOM_MODEL || null);
        return { speaker: key, content: response };
      })
    );

    const messages = [
      { speaker: 'user', content: pitch },
      ...responses,
    ];

    const session = await Boardroom.create({
      user: req.user._id,
      workspace: workspace._id,
      title: pitch.slice(0, 60) + (pitch.length > 60 ? '...' : ''),
      pitch,
      messages,
    });

    await Workspace.findByIdAndUpdate(workspace._id, {
      $inc: { 'stats.boardroomSessions': 1 },
      lastActivity: new Date(),
    });

    res.json({ success: true, sessionId: session._id, messages: responses });
  } catch (err) {
    console.error('Boardroom pitch error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'The Board Room is unavailable right now. Please try again.') });
  }
});

router.post('/respond/:id', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    const session = await Boardroom.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false, message: 'Session not found.' });

    session.messages.push({ speaker: 'user', content: message });

    const conversationSummary = session.messages.slice(-10).map(m => {
      const name = m.speaker === 'user' ? 'Founder' : PERSONALITIES[m.speaker]?.name || m.speaker;
      return `${name}: ${m.content}`;
    }).join('\n\n');

    // Pick 1-2 personalities to respond (feels more natural)
    const respondents = Object.keys(PERSONALITIES);
    const toRespond = Math.random() > 0.4
      ? respondents
      : [respondents[Math.floor(Math.random() * respondents.length)]];

    const responses = await Promise.all(
      toRespond.map(async (key) => {
        const p = PERSONALITIES[key];
        const prompt = `${p.style}\n\nHere is the conversation so far:\n${conversationSummary}\n\nThe founder just said: "${message}"\n\nRespond in 2-4 sentences from your perspective as ${p.name}. Be direct and specific.`;
        const response = await aiService.complete(prompt, null, process.env.BOARDROOM_MODEL || null);
        session.messages.push({ speaker: key, content: response });
        return { speaker: key, content: response };
      })
    );

    await session.save();
    res.json({ success: true, messages: responses });
  } catch (err) {
    console.error('Boardroom respond error:', err);
    res.json({ success: false, message: aiErrorMessage(err) });
  }
});

router.post('/verdict/:id', requireAuth, async (req, res) => {
  try {
    const session = await Boardroom.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.json({ success: false });

    const conversationText = session.messages.map(m => {
      const name = m.speaker === 'user' ? 'Founder' : PERSONALITIES[m.speaker]?.name || m.speaker;
      return `${name}: ${m.content}`;
    }).join('\n\n');

    const verdictPrompt = `Based on the following Board Room discussion about this idea: "${session.pitch}"

Conversation:
${conversationText}

Provide a comprehensive verdict in this EXACT JSON format (respond with only valid JSON, no markdown):
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "score": 7
}

The score is out of 10. Be honest and constructive. Do not invent points not discussed.`;

    const verdictRaw = await aiService.complete(verdictPrompt, null, process.env.BOARDROOM_MODEL || null);
    const cleanJson = verdictRaw.replace(/```json\n?|\n?```/g, '').trim();
    const verdict = JSON.parse(cleanJson);

    session.verdict = verdict;
    session.isComplete = true;
    await session.save();

    res.json({ success: true, verdict });
  } catch (err) {
    console.error('Verdict error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'Could not generate verdict. Please try again.') });
  }
});

module.exports = router;
