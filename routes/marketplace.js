const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const InstalledAgent = require('../models/InstalledAgent');
const AgentRun = require('../models/AgentRun');
const Workspace = require('../models/Workspace');
const aiService = require('../services/aiService');
const { aiErrorMessage } = require('../utils/aiErrors');

/**
 * AGENTS catalog. Each agent has a real systemPrompt — when "run", the
 * agent's prompt + the user's input is sent through aiService.complete(),
 * exactly like Research Studio or the Boardroom. Nothing here is decorative.
 */
const AGENTS = [
  {
    id: 'research-pro', name: 'Research Pro', category: 'Research', icon: 'search',
    description: 'Deep market analysis, competitor intelligence, and trend identification across any industry.',
    placeholder: 'Describe the market or industry you want analyzed...',
    systemPrompt: `You are Research Pro, a specialist AI agent focused exclusively on deep market and competitive analysis.
Given a market, industry, or business idea, produce a sharp, structured report covering: market size and growth, key competitors with their strengths/weaknesses, emerging trends, and clear opportunities a new entrant could exploit.
Use markdown with clear headings. Be specific with numbers and named competitors where reasonably inferable. No fluff, no disclaimers — just the analysis.`,
  },
  {
    id: 'ui-designer', name: 'UI Designer', category: 'Design', icon: 'layout',
    description: 'Generate complete UI specifications, component structures, and design system recommendations.',
    placeholder: 'Describe the product or screen you need designed...',
    systemPrompt: `You are UI Designer, a specialist AI agent focused exclusively on interface design specifications.
Given a product or screen description, produce: a recommended layout structure, a component breakdown (buttons, cards, navigation, etc), a color and typography direction, and key UX considerations.
Use markdown with clear headings. Be concrete and implementable, not abstract — describe things a developer could build directly from your spec.`,
  },
  {
    id: 'seo-agent', name: 'SEO Intelligence', category: 'Marketing', icon: 'trending-up',
    description: 'Keyword research, content strategy, and SEO architecture planning for new projects.',
    placeholder: 'Describe your website, product, or content niche...',
    systemPrompt: `You are SEO Intelligence, a specialist AI agent focused exclusively on search engine optimization strategy.
Given a website, product, or niche, produce: a target keyword cluster (primary + long-tail), a recommended content/page structure, on-page SEO priorities, and quick technical SEO wins.
Use markdown with clear headings. Be specific with actual example keywords, not generic categories.`,
  },
  {
    id: 'marketing-agent', name: 'Marketing Strategist', category: 'Marketing', icon: 'megaphone',
    description: 'Go-to-market strategy, channel analysis, and customer acquisition planning.',
    placeholder: 'Describe your product and target audience...',
    systemPrompt: `You are Marketing Strategist, a specialist AI agent focused exclusively on go-to-market and growth strategy.
Given a product and audience, produce: the best-fit acquisition channels ranked by likely ROI, a positioning statement, a launch sequence (first 30/60/90 days), and key metrics to track.
Use markdown with clear headings. Be decisive — pick the best channels rather than listing everything possible.`,
  },
  {
    id: 'deploy-guide', name: 'Deployment Expert', category: 'DevOps', icon: 'server',
    description: 'Platform-specific deployment guides, environment configuration, and infrastructure advice.',
    placeholder: 'Describe your project stack and where you want to deploy it...',
    systemPrompt: `You are Deployment Expert, a specialist AI agent focused exclusively on deployment and infrastructure guidance.
Given a project's tech stack and target hosting platform, produce: a step-by-step deployment plan, required environment variables, and common pitfalls for that specific stack/platform combination.
Use markdown with clear, numbered steps. Be platform-specific — name actual services, dashboards, and settings.`,
  },
  {
    id: 'pitch-coach', name: 'Pitch Coach', category: 'Business', icon: 'mic',
    description: 'Refine your investor pitch, improve your narrative, and prepare for tough questions.',
    placeholder: 'Paste your pitch or describe your startup idea...',
    systemPrompt: `You are Pitch Coach, a specialist AI agent focused exclusively on sharpening investor pitches.
Given a pitch or startup idea, produce: a tightened one-paragraph narrative, the 3 toughest questions an investor would ask, strong suggested answers to each, and one specific weakness in the current framing to fix.
Use markdown with clear headings. Be direct and a little demanding — treat this like real pitch prep, not encouragement.`,
  },
  {
    id: 'security-audit', name: 'Security Auditor', category: 'Engineering', icon: 'shield',
    description: 'Identify security vulnerabilities, recommend best practices, and audit your architecture.',
    placeholder: 'Describe your application architecture or paste a code snippet...',
    systemPrompt: `You are Security Auditor, a specialist AI agent focused exclusively on application security review.
Given an architecture description or code snippet, produce: identified vulnerabilities or risk areas ranked by severity, specific remediation steps for each, and general hardening recommendations relevant to the described stack.
Use markdown with clear headings. Be precise about WHY each issue is a risk, not just that it is one.`,
  },
  {
    id: 'data-architect', name: 'Data Architect', category: 'Engineering', icon: 'database',
    description: 'Database design, schema planning, and data modeling for scalable applications.',
    placeholder: 'Describe your application and its data needs...',
    systemPrompt: `You are Data Architect, a specialist AI agent focused exclusively on database design and data modeling.
Given an application description, produce: a recommended database type (relational vs document, etc) with justification, a core schema with key tables/collections and relationships, and indexing or scaling considerations.
Use markdown with clear headings. Be concrete with actual field names and types, not abstractions.`,
  },
];

function getAgent(agentId) {
  return AGENTS.find(a => a.id === agentId);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const installed = await InstalledAgent.find({ user: req.user._id });
    const installedIds = new Set(installed.map(i => i.agentId));
    const agentsWithStatus = AGENTS.map(a => ({ ...a, installed: installedIds.has(a.id) }));

    res.render('dashboard/marketplace', {
      title: 'Marketplace — Axiom Cloud',
      activeSection: 'marketplace',
      agents: agentsWithStatus,
    });
  } catch (err) {
    console.error('Marketplace load error:', err);
    // Database unavailable — show the catalog with everything marked as not-installed
    // rather than crashing the page.
    res.render('dashboard/marketplace', {
      title: 'Marketplace — Axiom Cloud',
      activeSection: 'marketplace',
      agents: AGENTS.map(a => ({ ...a, installed: false })),
    });
  }
});

router.post('/install/:agentId', requireAuth, async (req, res) => {
  try {
    const agent = getAgent(req.params.agentId);
    if (!agent) return res.json({ success: false, message: 'Agent not found.' });

    const existing = await InstalledAgent.findOne({ user: req.user._id, agentId: agent.id });
    if (existing) return res.json({ success: true, alreadyInstalled: true });

    await InstalledAgent.create({ user: req.user._id, agentId: agent.id });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Could not install agent.' });
  }
});

router.post('/uninstall/:agentId', requireAuth, async (req, res) => {
  try {
    await InstalledAgent.findOneAndDelete({ user: req.user._id, agentId: req.params.agentId });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Could not uninstall agent.' });
  }
});

router.get('/run/:agentId', requireAuth, async (req, res) => {
  const agent = getAgent(req.params.agentId);
  if (!agent) return res.redirect('/marketplace');

  try {
    const installedRecord = await InstalledAgent.findOne({ user: req.user._id, agentId: agent.id });
    if (!installedRecord) return res.redirect('/marketplace');

    const runs = await AgentRun.find({ user: req.user._id, agentId: agent.id }).sort({ createdAt: -1 }).limit(10);

    res.render('dashboard/agent-run', {
      title: `${agent.name} — Axiom Cloud`,
      activeSection: 'marketplace',
      agent, runs,
    });
  } catch (err) {
    console.error('Agent run page load error:', err);
    res.redirect('/marketplace');
  }
});

router.post('/run/:agentId', requireAuth, async (req, res) => {
  try {
    const agent = getAgent(req.params.agentId);
    if (!agent) return res.json({ success: false, message: 'Agent not found.' });

    const installedRecord = await InstalledAgent.findOne({ user: req.user._id, agentId: agent.id });
    if (!installedRecord) return res.json({ success: false, message: 'Install this agent before using it.' });

    const { input, workspaceId } = req.body;
    if (!input?.trim()) return res.json({ success: false, message: 'Please provide some input.' });

    let workspace = await Workspace.findOne({ _id: workspaceId, user: req.user._id });
    if (!workspace) workspace = await Workspace.findOne({ user: req.user._id, isArchived: false }).sort({ lastActivity: -1 });
    if (!workspace) return res.json({ success: false, message: 'No workspace found.' });

    const output = await aiService.complete(input, agent.systemPrompt);

    await AgentRun.create({
      user: req.user._id,
      workspace: workspace._id,
      agentId: agent.id,
      agentName: agent.name,
      input,
      output,
    });

    installedRecord.usageCount += 1;
    installedRecord.lastUsedAt = new Date();
    await installedRecord.save();

    res.json({ success: true, output });
  } catch (err) {
    console.error('Agent run error:', err);
    res.json({ success: false, message: aiErrorMessage(err, 'The agent encountered an issue. Please try again.') });
  }
});

module.exports = router;
