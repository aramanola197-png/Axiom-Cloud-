/**
 * 0G Compute Provider Adapter
 * -----------------------------
 * Implements the AI Service contract (complete, chat) using the 0G Router API.
 * The 0G Router is OpenAI-compatible, so we reuse the official "openai" SDK
 * pointed at a custom baseURL — no 0G-specific SDK needed.
 *
 * Required env vars:
 *   ZG_BASE_URL   e.g. https://router-api.0g.ai/v1
 *   ZG_API_KEY    supplied by the user later
 *
 * If ZG_API_KEY is missing, this adapter does NOT crash the app — it throws
 * a clear, catchable error only when an AI call is actually attempted, so
 * routes can show a graceful "AI not configured" empty state instead.
 */
let OpenAI;
try {
  OpenAI = require('openai');
} catch (e) {
  // Package missing entirely — extremely unlikely since it's a core dependency,
  // but handled the same defensive way as the other optional providers.
}

function isConfigured() {
  return Boolean(process.env.ZG_API_KEY && process.env.ZG_BASE_URL);
}

function getClient() {
  if (!OpenAI) {
    throw new Error('The "openai" package is not installed. Run: npm install openai');
  }
  if (!isConfigured()) {
    throw new Error(
      'AI_NOT_CONFIGURED: ZG_API_KEY and/or ZG_BASE_URL are missing from your .env file. ' +
      'Add them to enable AI features. The app continues to run normally without them.'
    );
  }
  return new OpenAI({
    apiKey: process.env.ZG_API_KEY,
    baseURL: process.env.ZG_BASE_URL,
  });
}

function resolveModel(envVarName, fallback) {
  return process.env[envVarName] || process.env.ZG_DEFAULT_MODEL || fallback;
}

async function complete(prompt, systemInstruction, modelOverride) {
  const client = getClient();
  const model = modelOverride || resolveModel('ZG_DEFAULT_MODEL', 'llama-3.3-70b-instruct');
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0].message.content;
}

async function chat(history, newMessage, systemInstruction, modelOverride) {
  const client = getClient();
  const model = modelOverride || resolveModel('ZG_DEFAULT_MODEL', 'llama-3.3-70b-instruct');
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  (history || []).forEach(msg => {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  });
  messages.push({ role: 'user', content: newMessage });

  const response = await client.chat.completions.create({ model, messages });
  return response.choices[0].message.content;
}

module.exports = { complete, chat, isConfigured };
