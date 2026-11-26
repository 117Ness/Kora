import { createGoogleGenerativeAI } from '@ai-sdk/google';

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  '';

export const googleProvider = createGoogleGenerativeAI({
  apiKey,
});

/**
 * Returns the configured Gemini LanguageModel instance for Vercel AI SDK.
 * Defaults to 'gemini-3.8-flash' or adheres to process.env.GEMINI_MODEL.
 */
export function getAIModel() {
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  return googleProvider(modelName);
}
