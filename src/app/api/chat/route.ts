import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { getAIModel } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { tools } from '@/lib/ai/tools';
import { getUserProfile } from '@/app/actions/profile';
import { getLibraryData } from '@/app/actions/kora';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      messages?: UIMessage[];
    };

    const messages = body.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
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
          daily_calorie_target: 2200,
          protein_target_g: 100,
          carbs_target_g: 250,
          fats_target_g: 70,
          micro_goals: ['High Fiber'],
          cookware: ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker'],
          dietary_preferences: null,
          updated_at: new Date().toISOString(),
        };

    const ingredients = libraryRes.success ? libraryRes.data.ingredients : [];
    const recipes = libraryRes.success ? libraryRes.data.recipes : [];

    const system = buildSystemPrompt({
      userProfile,
      ingredients,
      recipes,
    });

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: getAIModel(),
      system,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
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
