import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { getAIModel, getFallbackAIModel } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { tools } from '@/lib/ai/tools';
import { getUserProfile } from '@/app/actions/profile';
import { getLibraryData } from '@/app/actions/kora';

/**
 * Detects whether an error indicates Google/Gemini 503 UNAVAILABLE, high demand,
 * rate limit / quota exhaustion, or an AI SDK retry exhaustion failure.
 */
function isHighDemandError(error: unknown): boolean {
  if (!error) return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as any;

  // Check HTTP status code on error, cause, or lastError
  if (
    err.statusCode === 503 ||
    err.status === 503 ||
    err.cause?.statusCode === 503 ||
    err.cause?.status === 503 ||
    err.lastError?.statusCode === 503 ||
    err.lastError?.status === 503
  ) {
    return true;
  }

  // Check error name (AI_RetryError or RetryError)
  const name = String(err.name || '');
  if (
    name === 'AI_RetryError' ||
    name === 'RetryError' ||
    name.includes('RetryError')
  ) {
    return true;
  }

  // Gather messages across error, cause, and lastError
  const messages: string[] = [];
  if (typeof err === 'string') {
    messages.push(err);
  } else if (err instanceof Error) {
    messages.push(err.message, err.name);
    if (err.cause) {
      if (err.cause instanceof Error) {
        messages.push(err.cause.message, err.cause.name);
      } else {
        messages.push(String(err.cause));
      }
    }
  }

  if (err.lastError) {
    if (err.lastError instanceof Error) {
      messages.push(err.lastError.message, err.lastError.name);
    } else {
      messages.push(String(err.lastError));
    }
  }

  try {
    messages.push(JSON.stringify(err));
  } catch {
    messages.push(String(err));
  }

  const combined = messages.join(' ').toLowerCase();

  return (
    combined.includes('503') ||
    combined.includes('unavailable') ||
    combined.includes('high demand') ||
    combined.includes('overloaded') ||
    combined.includes('resource_exhausted') ||
    combined.includes('rate limit') ||
    combined.includes('retry') ||
    combined.includes('ai_retryerror') ||
    combined.includes('temporarily unavailable')
  );
}

/**
 * Unmasks stream errors so client UI receives descriptive error feedback
 * instead of the default generic "An error occurred."
 */
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      messages?: UIMessage[];
    };

    const messages = body.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(
        JSON.stringify({
          error:
            messages.length > 50
              ? 'Too many messages in conversation history'
              : 'Messages array is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parallel fetch of user profile, pantry ingredients, and existing recipes
    const [profileRes, libraryRes] = await Promise.all([
      getUserProfile(),
      getLibraryData(),
    ]);

    const userProfile = profileRes.success
      ? profileRes.data
      : {
          id: 'guest',
          display_name: 'Guest Chef',
          daily_calorie_target: 2800,
          protein_target_g: 120,
          carbs_target_g: 350,
          fats_target_g: 85,
          micro_goals: ['High Fiber', 'Iron Rich'],
          cookware: ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker'],
          dietary_preferences: null,
          updated_at: '1970-01-01T00:00:00.000Z',
        };

    const ingredients = libraryRes.success ? libraryRes.data.ingredients : [];
    const recipes = libraryRes.success ? libraryRes.data.recipes : [];

    const system = buildSystemPrompt({
      userProfile,
      ingredients,
      recipes,
    });

    const modelMessages = await convertToModelMessages(messages);

    const callStream = (
      model: ReturnType<typeof getAIModel>,
      maxRetries: number
    ) =>
      streamText({
        model,
        system,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(5),
        maxRetries,
      });

    let result: ReturnType<typeof callStream>;

    try {
      result = callStream(getAIModel(), 1);

      // Peek initial chunks from the stream to catch immediate 503 / UNAVAILABLE / RetryError failures
      const reader = result.stream.getReader();
      try {
        const c1 = await reader.read();
        if (!c1.done) {
          if (c1.value?.type === 'error' && isHighDemandError(c1.value.error)) {
            throw c1.value.error;
          }
          const c2 = await reader.read();
          if (
            !c2.done &&
            c2.value?.type === 'error' &&
            isHighDemandError(c2.value.error)
          ) {
            throw c2.value.error;
          }
        }
      } catch (streamError) {
        if (isHighDemandError(streamError)) {
          console.warn(
            '[Kora AI] Primary Gemini model stream threw high demand error on initial read. Falling back to fallback model:',
            streamError
          );
          result = callStream(getFallbackAIModel(), 2);
        } else {
          throw streamError;
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (isHighDemandError(error)) {
        console.warn(
          '[Kora AI] Primary Gemini model call failed synchronously with high demand error. Falling back to fallback model:',
          error
        );
        result = callStream(getFallbackAIModel(), 2);
      } else {
        throw error;
      }
    }

    return result.toUIMessageStreamResponse({
      onError: formatErrorMessage,
    });
  } catch (error) {
    console.error('Kora Chat API Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
