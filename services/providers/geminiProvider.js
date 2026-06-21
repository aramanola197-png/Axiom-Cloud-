/**
 * Gemini Provider Adapter
 * ------------------------
 * Implements the AI Service contract using Google's Generative AI SDK.
 * This file is the ONLY place in the codebase that should import
 * @google/generative-ai. Only used when AI_PROVIDER=gemini.
 */
let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch (e) {
  // Package not installed — only matters if AI_PROVIDER=gemini is actually selected.
}

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getModel(modelOverride) {
  if (!GoogleGenerativeAI) {
    throw new Error('The "@google/generative-ai" package is not installed. Run: npm install @google/generative-ai');
  }
  if (!isConfigured()) {
    throw new Error('AI_NOT_CONFIGURED: GEMINI_API_KEY is missing from your .env file.');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: modelOverride || MODEL_NAME });
}

async function complete(prompt, systemInstruction, modelOverride) {
  const model = getModel(modelOverride);
  const text = systemInstruction
    ? `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER REQUEST]\n${prompt}`
    : prompt;
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text }] }],
  });
  return result.response.text();
}

async function chat(history, newMessage, systemInstruction, modelOverride) {
  const model = getModel(modelOverride);
  const chatHistory = (history || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  if (systemInstruction && chatHistory.length === 0) {
    chatHistory.unshift({ role: 'user', parts: [{ text: `[SYSTEM]\n${systemInstruction}` }] });
    chatHistory.push({ role: 'model', parts: [{ text: 'Understood. I am ready.' }] });
  }

  const session = model.startChat({ history: chatHistory });
  const result = await session.sendMessage(newMessage);
  return result.response.text();
}

module.exports = { complete, chat, isConfigured };
