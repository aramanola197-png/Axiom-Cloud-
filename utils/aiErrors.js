/**
 * AI Error Helper
 * -----------------
 * Used by every route that calls the AI Service. Detects the
 * "AI_NOT_CONFIGURED" error tag thrown by provider adapters when
 * required environment variables are missing, and converts it into a
 * friendly, consistent message for the client — instead of letting it
 * surface as a raw stack trace or generic failure.
 */
function isAiNotConfiguredError(err) {
  return Boolean(err && err.message && err.message.startsWith('AI_NOT_CONFIGURED'));
}

function aiErrorMessage(err, fallback = 'The AI system encountered an issue. Please try again.') {
  if (isAiNotConfiguredError(err)) {
    return 'AI features are not yet configured. Add your AI provider credentials to the .env file to enable this.';
  }
  return fallback;
}

module.exports = { isAiNotConfiguredError, aiErrorMessage };
