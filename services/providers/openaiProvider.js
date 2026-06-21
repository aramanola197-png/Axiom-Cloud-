/**
 * OpenAI Provider Adapter
 * ------------------------
 * Implements the AI Service contract (complete, chat) using the OpenAI API.
 * The "openai" package is already a core dependency (also used by the 0G
 * adapter, since 0G's Router API is OpenAI-compatible). To activate this
 * adapter specifically, set AI_PROVIDER=openai and OPENAI_API_KEY in .env.
 */
let OpenAI;
try {
  OpenAI = require('openai');
} catch (e) {
  // Defensive only — "openai" is a core dependency and should always be present.
}

const MODEL_NAME = process.env.OPENAI_MODEL || 'gpt-4o';

function isConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient() {
  if (!OpenAI) {
    throw new Error('The "openai" package is not installed. Run: npm install openai');
  }
  if (!isConfigured()) {
    throw new Error('AI_NOT_CONFIGURED: OPENAI_API_KEY is missing from your .env file.');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function complete(prompt, systemInstruction, modelOverride) {
  const client = getClient();
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model: modelOverride || MODEL_NAME,
    messages,
  });
  return response.choices[0].message.content;
}

async function chat(history, newMessage, systemInstruction, modelOverride) {
  const client = getClient();
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  (history || []).forEach(msg => {
    messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
  });
  messages.push({ role: 'user', content: newMessage });

  const response = await client.chat.completions.create({
    model: modelOverride || MODEL_NAME,
    messages,
  });
  return response.choices[0].message.content;
}

module.exports = { complete, chat, isConfigured };
