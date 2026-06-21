// deployment.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');

const DEPLOYMENT_SYSTEM = `You are Axiom Cloud's Deployment Assistant — a patient, knowledgeable DevOps and deployment guide.
Your role is to help users deploy their applications to the internet.

You help with:
- Choosing the right hosting platform (Render, Railway, Vercel, Netlify, DigitalOcean, etc.)
- Setting up environment variables
- Configuring databases (MongoDB Atlas, PlanetScale, Supabase)
- Connecting custom domains
- Troubleshooting deployment errors
- Understanding build logs and error messages

Always explain things in plain language. Never assume the user knows technical jargon.
When suggesting steps, be numbered and sequential. Never skip steps.
Remind users to never share API keys or secrets publicly.
Be encouraging — deployment can be frustrating and users need patience and clarity.`;

const sessions = new Map(); // In-memory for deployment chats (stateless per session is fine)

router.get('/', requireAuth, (req, res) => {
  res.render('dashboard/deployment', {
    title: 'Deployment Assistant — Axiom Cloud',
    activeSection: 'deployment',
  });
});

router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    const chatHistory = Array.isArray(history) ? history : [];
    const response = await aiService.chat(chatHistory, message, DEPLOYMENT_SYSTEM);
    res.json({ success: true, response });
  } catch (err) {
    res.json({ success: false, message: aiErrorMessage(err, 'The Deployment Assistant is unavailable. Please try again.') });
  }
});

module.exports = router;
