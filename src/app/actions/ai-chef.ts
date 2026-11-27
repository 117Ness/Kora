'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type {
  AcceptProposedRecipeOptions,
  AcceptProposedRecipeResult,
  CanonicalUnit,
  ProposedRecipeIngredient,
  ProposedRecipePayload,
  ScaledRecipePayload,
} from '@/types/ai';

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const proposedIngredientSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required'),
  quantity: z.coerce.number().positive('Ingredient quantity must be > 0'),
  unit: z.enum(['g', 'ml', 'pcs']).optional().default('g'),
  weight_per_unit_g: z.coerce.number().positive().nullish(),
  estimated_cost_inr: z.coerce.number().min(0).optional().default(0),
  calories: z.coerce.number().min(0).optional().default(0),
  protein_g: z.coerce.number().min(0).optional().default(0),
  carbs_g: z.coerce.number().min(0).optional().default(0),
  fats_g: z.coerce.number().min(0).optional().default(0),
});

const acceptOptionsSchema = z
  .object({
    addToDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'addToDate must be YYYY-MM-DD')
      .optional(),
    replaceRecipeId: z.string().uuid('Invalid replaceRecipeId').optional(),
  })
  .optional();

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function parseDayOfWeek(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day).getDay();
  }
  return new Date(dateStr).getDay();
}

/**
 * Commits an AI-generated recipe proposal (or scaled recipe / plan meal) directly into Supabase.
 * - Requires an authenticated user so personal pantry/recipes/schedules are strictly isolated
 * - Resolves or creates missing canonical ingredients
 * - Persists recipe and recipe_ingredients
 * - Optionally schedules onto day_plans if addToDate is provided
 */
export async function acceptProposedRecipe(
  proposal: ProposedRecipePayload | ScaledRecipePayload | Record<string, unknown>,
  options?: AcceptProposedRecipeOptions
): Promise<ActionResult<AcceptProposedRecipeResult>> {
  const parsedOptions = acceptOptionsSchema.safeParse(options);
  if (!parsedOptions.success) {
    return {
      success: false,
      error: parsedOptions.error.issues.map((i) => i.message).join('; '),
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return {
        success: false,
        error: 'Please sign in (via Kitchen & Goals) to save recipes to your kitchen.',
      };
    }

    // 1. Normalize & validate proposal fields
    const recipeName = (
      (proposal as ProposedRecipePayload).name ||
      (proposal as ScaledRecipePayload).recipe_title ||
      'AI Curated Recipe'
    ).trim();

    const rawIngredientsInput =
      (proposal as ProposedRecipePayload).ingredients ||
      (proposal as ScaledRecipePayload).scaled_ingredients ||
      [];

    const parsedIngredients = z
      .array(proposedIngredientSchema)
      .min(1, 'Recipe proposal contains no valid ingredients')
      .safeParse(rawIngredientsInput);

    if (!parsedIngredients.success) {
      return {
        success: false,
        error: parsedIngredients.error.issues.map((i) => i.message).join('; '),
      };
    }

    const rawIngredients: ProposedRecipeIngredient[] = parsedIngredients.data;

    const instructions: string[] = Array.isArray(
      (proposal as ProposedRecipePayload).instructions ||
        (proposal as ScaledRecipePayload).updated_instructions
    )
      ? (
          (proposal as ProposedRecipePayload).instructions ||
          (proposal as ScaledRecipePayload).updated_instructions ||
          []
        ).map(String)
      : [];

    const description: string =
      typeof (proposal as ProposedRecipePayload).description === 'string'
        ? (proposal as ProposedRecipePayload).description
        : '';
    const cookwareNeeded: string[] = Array.isArray(
      (proposal as ProposedRecipePayload).cookware_needed
    )
      ? (proposal as ProposedRecipePayload).cookware_needed.map(String)
      : [];

    const notesParts: string[] = [];
    if (description) notesParts.push(description);
    if (cookwareNeeded.length > 0) {
      notesParts.push(`Cookware: ${cookwareNeeded.join(', ')}`);
    }
    if (instructions.length > 0) {
      notesParts.push(
        'Instructions:\n' +
          instructions.map((step, idx) => `${idx + 1}. ${step}`).join('\n')
      );
    }
    const notes = notesParts.join('\n\n');

    // 2. Resolve / Create Ingredients strictly scoped to user.id (or read-only public templates)
    const resolvedIngredients: { ingredientId: string; quantity: number }[] = [];

    for (const ing of rawIngredients) {
      const ingName = ing.name.trim();
      const escapedIngName = escapeIlikePattern(ingName);
      const canonicalUnit: CanonicalUnit =
        ing.unit === 'g' || ing.unit === 'ml' || ing.unit === 'pcs'
          ? ing.unit
          : 'g';

      const { data: existingIng, error: findErr } = await supabase
        .from('ingredients')
        .select('id, user_id')
        .or(`user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`)
        .ilike('name', escapedIngName)
        .order('user_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (findErr) return { success: false, error: findErr.message };

      let ingredientId: string;

      if (existingIng) {
        ingredientId = existingIng.id;
      } else {
        // Calculate sensible pack dimensions & unit economics
        let packSize = 500;
        let packCost = 50;

        if (canonicalUnit === 'pcs') {
          packSize = 1;
          packCost =
            ing.quantity > 0 && ing.estimated_cost_inr > 0
              ? Math.max(
                  1,
                  Math.round((ing.estimated_cost_inr / ing.quantity) * 100) / 100
                )
              : 7;
        } else if (canonicalUnit === 'ml') {
          packSize = 500;
          const unitRate =
            ing.quantity > 0 && ing.estimated_cost_inr > 0
              ? ing.estimated_cost_inr / ing.quantity
              : 0.06;
          packCost = Math.round(unitRate * 500 * 100) / 100;
        } else {
          // 'g'
          packSize = 500;
          const unitRate =
            ing.quantity > 0 && ing.estimated_cost_inr > 0
              ? ing.estimated_cost_inr / ing.quantity
              : 0.2;
          packCost = Math.round(unitRate * 500 * 100) / 100;
        }

        const qtySafe = Math.max(0.001, ing.quantity);
        const caloriesPerUnit = (ing.calories ?? 0) / qtySafe;
        const proteinPerUnit = (ing.protein_g ?? 0) / qtySafe;
        const carbsPerUnit = (ing.carbs_g ?? 0) / qtySafe;
        const fatsPerUnit = (ing.fats_g ?? 0) / qtySafe;
        const weightPerUnitG =
          ing.weight_per_unit_g ?? (canonicalUnit === 'pcs' ? 50 : null);

        const { data: newIng, error: createIngErr } = await supabase
          .from('ingredients')
          .insert({
            user_id: user.id,
            is_public: false,
            name: ingName,
            unit: canonicalUnit,
            pack_size: packSize,
            pack_cost: packCost,
            calories_per_unit: caloriesPerUnit,
            protein_per_unit: proteinPerUnit,
            carbs_per_unit: carbsPerUnit,
            fats_per_unit: fatsPerUnit,
            weight_per_unit_g: weightPerUnitG,
            stock_quantity: 0,
          })
          .select('id')
          .single();

        if (createIngErr || !newIng) {
          return {
            success: false,
            error: createIngErr?.message ?? `Failed to create ingredient ${ingName}`,
          };
        }

        ingredientId = newIng.id;
      }

      resolvedIngredients.push({
        ingredientId,
        quantity: ing.quantity,
      });
    }

    // Aggregate duplicate ingredients within same recipe proposal
    const aggregatedMap = new Map<string, number>();
    for (const item of resolvedIngredients) {
      aggregatedMap.set(
        item.ingredientId,
        (aggregatedMap.get(item.ingredientId) ?? 0) + item.quantity
      );
    }

    // 3. Insert or Update Recipe (strictly scoped to user.id)
    let recipeId = parsedOptions.data?.replaceRecipeId;

    if (recipeId) {
      const { data: updatedRec, error: upErr } = await supabase
        .from('recipes')
        .update({ name: recipeName, notes })
        .eq('id', recipeId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle();

      if (upErr) return { success: false, error: upErr.message };

      if (updatedRec) {
        const { error: delRiErr } = await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', recipeId);

        if (delRiErr) return { success: false, error: delRiErr.message };
      } else {
        // If replacing a starter template or non-owned ID, fork as a new user-owned recipe
        const { data: forkedRecipe, error: forkErr } = await supabase
          .from('recipes')
          .insert({
            user_id: user.id,
            is_public: false,
            name: recipeName,
            notes,
          })
          .select('id')
          .single();

        if (forkErr || !forkedRecipe) {
          return {
            success: false,
            error: forkErr?.message ?? 'Failed to save scaled recipe',
          };
        }
        recipeId = forkedRecipe.id;
      }
    } else {
      const { data: newRecipe, error: recErr } = await supabase
        .from('recipes')
        .insert({
          user_id: user.id,
          is_public: false,
          name: recipeName,
          notes,
        })
        .select('id')
        .single();

      if (recErr || !newRecipe) {
        return {
          success: false,
          error: recErr?.message ?? 'Failed to create recipe',
        };
      }

      recipeId = newRecipe.id;
    }

    // 4. Insert recipe_ingredients links
    const riRows = Array.from(aggregatedMap.entries()).map(
      ([ingredient_id, quantity_used]) => ({
        recipe_id: recipeId!,
        ingredient_id,
        quantity_used,
      })
    );

    if (riRows.length > 0) {
      const { error: riErr } = await supabase
        .from('recipe_ingredients')
        .insert(riRows);
      if (riErr) return { success: false, error: riErr.message };
    }

    // 5. Schedule into Day Plans if addToDate is provided
    let dayPlanId: string | undefined;

    if (parsedOptions.data?.addToDate) {
      const dayOfWeek = parseDayOfWeek(parsedOptions.data.addToDate);
      const rawServings = Number(
        (proposal as ProposedRecipePayload).servings ||
          (proposal as ScaledRecipePayload).updated_servings ||
          1
      );
      const servings = Number.isFinite(rawServings) && rawServings > 0 ? rawServings : 1;

      const { data: maxRow } = await supabase
        .from('day_plans')
        .select('sort_order')
        .eq('user_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const sortOrder = maxRow ? Number(maxRow.sort_order) + 1 : 0;

      const { data: existingPlan } = await supabase
        .from('day_plans')
        .select('id, servings')
        .eq('user_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .eq('recipe_id', recipeId!)
        .maybeSingle();

      if (existingPlan) {
        const { data: updatedPlan, error: upPlanErr } = await supabase
          .from('day_plans')
          .update({ servings: Number(existingPlan.servings) + servings })
          .eq('id', existingPlan.id)
          .eq('user_id', user.id)
          .select('id')
          .single();

        if (upPlanErr) return { success: false, error: upPlanErr.message };
        dayPlanId = updatedPlan?.id;
      } else {
        const { data: newPlan, error: planErr } = await supabase
          .from('day_plans')
          .insert({
            user_id: user.id,
            day_of_week: dayOfWeek,
            recipe_id: recipeId!,
            servings,
            sort_order: sortOrder,
          })
          .select('id')
          .single();

        if (planErr) return { success: false, error: planErr.message };
        dayPlanId = newPlan?.id;
      }
    }

    revalidatePath('/');
    revalidatePath('/library');
    revalidatePath('/insights');

    return {
      success: true,
      data: {
        recipeId: recipeId!,
        recipeName,
        dayPlanId,
      },
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Failed to accept recipe proposal',
    };
  }
}
