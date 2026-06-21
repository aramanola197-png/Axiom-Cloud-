/**
 * Claude (Anthropic) Provider Adapter
 * -------------------------------------
 * Implements the AI Service contract (complete, chat) using the Anthropic API.
 * To activate: set AI_PROVIDER=claude and ANTHROPIC_API_KEY in .env, then
 * run `npm install @anthropic-ai/sdk` (not installed by default — only
 * needed if you actually switch to this provider).
 */
let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
  // Package not installed — only matters if AI_PROVIDER=claude is actually selected.
}

const MODEL_NAME = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  if (!Anthropic) {
    throw new Error('The "@anthropic-ai/sdk" package is not installed. Run: npm install @anthropic-ai/sdk');
  }
  if (!isConfigured()) {
    throw new Error('AI_NOT_CONFIGURED: ANTHROPIC_API_KEY is missing from your .env file.');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function complete(prompt, systemInstruction, modelOverride) {
  const client = getClient();
  const response = await client.messages.create({
    model: modelOverride || MODEL_NAME,
    max_tokens: 4096,
    system: systemInstruction || undefined,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].text;
}

async function chat(history, newMessage, systemInstruction, modelOverride) {
  const client = getClient();
  const messages = (history || []).map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));
  messages.push({ role: 'user', content: newMessage });

  const response = await client.messages.create({
    model: modelOverride || MODEL_NAME,
    max_tokens: 4096,
    system: systemInstruction || undefined,
    messages,
  });
  return response.content[0].text;
}

module.exports = { complete, chat, isConfigured };
