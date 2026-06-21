/**
 * AI Service — Provider-Agnostic Abstraction Layer
 * ---------------------------------------------------
 * Every AI-powered module in Axiom Cloud (Research Studio, AI Tutor, Builder,
 * Board Room, Database Studio, Marketplace agents, future systems) calls
 * EXCLUSIVELY into this file. No page, route, or controller may import a
 * provider SDK (0G, Gemini, OpenAI, Claude) directly.
 *
 * Switching providers is a single environment variable change:
 *   AI_PROVIDER=0g      (default — 0G Compute via the 0G Router API)
 *   AI_PROVIDER=gemini
 *   AI_PROVIDER=openai
 *   AI_PROVIDER=claude
 *
 * No source code changes are ever required to switch providers.
 *
 * ── Per-feature model selection ────────────────────────────────
 * Optional env vars let each feature use a different model without any
 * code changes: RESEARCH_MODEL, TUTOR_MODEL, BOARDROOM_MODEL, BUILDER_MODEL,
 * DATABASE_MODEL. Any of these left blank falls back to ZG_DEFAULT_MODEL
 * (or the active provider's built-in default if that's blank too).
 *
 * ── Public API ──────────────────────────────────────────────
 *   complete(prompt, systemInstruction, modelOverride)        -> string
 *   chat(history, newMessage, systemInstruction, modelOverride) -> string
 *   research(query, systemInstruction)                         -> string  (uses RESEARCH_MODEL)
 *   explain(topic, systemInstruction)                          -> string  (uses TUTOR_MODEL)
 *   summarize(text, systemInstruction)                         -> string
 *   askDeeper(history, followUp, systemInstruction)            -> string  (alias of chat)
 *   generateQuiz(context, systemInstruction)                   -> string  (uses TUTOR_MODEL, raw JSON text)
 *   generateMindMap(topic, systemInstruction)                  -> string  (uses RESEARCH_MODEL, raw JSON text)
 *   generateSchema(description, systemInstruction)             -> string  (uses DATABASE_MODEL, raw JSON text)
 *   isReady()                                                  -> boolean (true if active provider is configured)
 *
 * If the active provider is not configured (e.g. ZG_API_KEY missing), every
 * method above throws a catchable error tagged "AI_NOT_CONFIGURED". Routes
 * are expected to catch this (see utils/aiErrors.js) and render a graceful
 * empty/setup state rather than letting it propagate into a crash. The
 * server itself NEVER crashes due to missing AI credentials — only an
 * individual AI-powered request fails.
 */

const PROVIDER = (process.env.AI_PROVIDER || '0g').toLowerCase();

function loadAdapter(name) {
  switch (name) {
    case '0g':
    case 'zg':
      return require('./providers/zgProvider');
    case 'gemini':
      return require('./providers/geminiProvider');
    case 'openai':
      return require('./providers/openaiProvider');
    case 'claude':
    case 'anthropic':
      return require('./providers/claudeProvider');
    default:
      console.warn(`Unknown AI_PROVIDER "${name}" — falling back to 0G.`);
      return require('./providers/zgProvider');
  }
}

const adapter = loadAdapter(PROVIDER);

function isReady() {
  if (typeof adapter.isConfigured === 'function') return adapter.isConfigured();
  return true; // Providers without an isConfigured() check (e.g. legacy adapters) are assumed ready.
}

async function complete(prompt, systemInstruction = null, modelOverride = null) {
  return adapter.complete(prompt, systemInstruction, modelOverride);
}

async function chat(history, newMessage, systemInstruction = null, modelOverride = null) {
  return adapter.chat(history, newMessage, systemInstruction, modelOverride);
}

/** Research-flavored single-turn call. Uses RESEARCH_MODEL if set. */
async function research(query, systemInstruction = null) {
  return complete(query, systemInstruction, process.env.RESEARCH_MODEL || null);
}

/** Tutor-flavored single-turn call. Uses TUTOR_MODEL if set. */
async function explain(topic, systemInstruction = null) {
  return complete(topic, systemInstruction, process.env.TUTOR_MODEL || null);
}

/** Summarization call. Thin semantic wrapper over complete(). */
async function summarize(text, systemInstruction = null) {
  const instruction = systemInstruction || 'Summarize the following content clearly and concisely, preserving key facts.';
  return complete(text, instruction);
}

/** Follow-up question within an existing conversation. Alias of chat() for semantic clarity at call sites. */
async function askDeeper(history, followUp, systemInstruction = null) {
  return chat(history, followUp, systemInstruction);
}

/** Returns raw text expected to be JSON describing a quiz. Uses TUTOR_MODEL if set. Caller parses/validates. */
async function generateQuiz(context, systemInstruction = null) {
  return complete(context, systemInstruction, process.env.TUTOR_MODEL || null);
}

/** Returns raw text expected to be JSON describing a mind map. Uses RESEARCH_MODEL if set. Caller parses/validates. */
async function generateMindMap(topic, systemInstruction = null) {
  return complete(topic, systemInstruction, process.env.RESEARCH_MODEL || null);
}

/** Returns raw text expected to be JSON describing a database schema. Uses DATABASE_MODEL if set. Caller parses/validates. */
async function generateSchema(description, systemInstruction = null) {
  return complete(description, systemInstruction, process.env.DATABASE_MODEL || null);
}

module.exports = {
  complete,
  chat,
  research,
  explain,
  summarize,
  askDeeper,
  generateQuiz,
  generateMindMap,
  generateSchema,
  isReady,
  provider: PROVIDER,
};
