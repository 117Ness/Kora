import { createGoogleGenerativeAI } from '@ai-sdk/google';

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  '';

export const googleProvider = createGoogleGenerativeAI({
  apiKey,
});

export const DEFAULT_PRIMARY_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

/**
 * Returns the primary configured Gemini LanguageModel instance for Vercel AI SDK.
 * Defaults to 'gemini-3.5-flash-lite' or adheres to process.env.GEMINI_MODEL.
 */
export function getAIModel() {
  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_PRIMARY_MODEL;
  return googleProvider(modelName);
}

/**
 * Returns the secondary fallback Gemini LanguageModel instance for Vercel AI SDK.
 * Defaults to 'gemini-3.1-flash-lite' or adheres to process.env.GEMINI_FALLBACK_MODEL.
 */
export function getFallbackAIModel() {
  const modelName =
    process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL;
  return googleProvider(modelName);
}
