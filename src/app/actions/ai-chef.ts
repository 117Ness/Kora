'use server';

import { revalidatePath } from 'next/cache';
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
 * - Resolves or creates missing canonical ingredients
 * - Persists recipe and recipe_ingredients
 * - Optionally schedules onto day_plans if addToDate is provided
 */
export async function acceptProposedRecipe(
  proposal: ProposedRecipePayload | ScaledRecipePayload | Record<string, unknown>,
  options?: AcceptProposedRecipeOptions
): Promise<ActionResult<AcceptProposedRecipeResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // 1. Normalize proposal fields
    const recipeName = (
      (proposal as ProposedRecipePayload).name ||
      (proposal as ScaledRecipePayload).recipe_title ||
      'AI Curated Recipe'
    ).trim();

    const rawIngredients: ProposedRecipeIngredient[] =
      (proposal as ProposedRecipePayload).ingredients ||
      (proposal as ScaledRecipePayload).scaled_ingredients ||
      [];

    if (!rawIngredients || rawIngredients.length === 0) {
      return { success: false, error: 'Recipe proposal contains no ingredients' };
    }

    const instructions: string[] =
      (proposal as ProposedRecipePayload).instructions ||
      (proposal as ScaledRecipePayload).updated_instructions ||
      [];

    const description: string = (proposal as ProposedRecipePayload).description || '';
    const cookwareNeeded: string[] = (proposal as ProposedRecipePayload).cookware_needed || [];

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

    // 2. Resolve / Create Ingredients
    const resolvedIngredients: { ingredientId: string; quantity: number }[] = [];

    for (const ing of rawIngredients) {
      const ingName = ing.name.trim();
      const canonicalUnit: CanonicalUnit =
        ing.unit === 'g' || ing.unit === 'ml' || ing.unit === 'pcs' ? ing.unit : 'g';

      let findQuery = supabase
        .from('ingredients')
        .select('id, pack_size, pack_cost, unit')
        .ilike('name', ingName);

      if (userId) {
        findQuery = findQuery.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        findQuery = findQuery.is('user_id', null);
      }

      const { data: existingIng, error: findErr } = await findQuery.maybeSingle();
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
              ? Math.max(1, Math.round((ing.estimated_cost_inr / ing.quantity) * 100) / 100)
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
            user_id: userId,
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

    // 3. Insert or Update Recipe
    let recipeId = options?.replaceRecipeId;

    if (recipeId) {
      let upQuery = supabase
        .from('recipes')
        .update({ name: recipeName, notes })
        .eq('id', recipeId);

      if (userId) {
        upQuery = upQuery.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        upQuery = upQuery.is('user_id', null);
      }

      const { error: upErr } = await upQuery;
      if (upErr) return { success: false, error: upErr.message };

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    } else {
      const { data: newRecipe, error: recErr } = await supabase
        .from('recipes')
        .insert({
          user_id: userId,
          name: recipeName,
          notes,
        })
        .select('id')
        .single();

      if (recErr || !newRecipe) {
        return { success: false, error: recErr?.message ?? 'Failed to create recipe' };
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
      const { error: riErr } = await supabase.from('recipe_ingredients').insert(riRows);
      if (riErr) return { success: false, error: riErr.message };
    }

    // 5. Schedule into Day Plans if addToDate is provided
    let dayPlanId: string | undefined;

    if (options?.addToDate) {
      const dayOfWeek = parseDayOfWeek(options.addToDate);
      const servings = Number(
        (proposal as ProposedRecipePayload).servings ||
          (proposal as ScaledRecipePayload).updated_servings ||
          1
      );

      let maxQuery = supabase
        .from('day_plans')
        .select('sort_order')
        .eq('day_of_week', dayOfWeek);

      if (userId) {
        maxQuery = maxQuery.eq('user_id', userId);
      } else {
        maxQuery = maxQuery.is('user_id', null);
      }

      const { data: maxRow } = await maxQuery
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const sortOrder = maxRow ? Number(maxRow.sort_order) + 1 : 0;

      // Check if recipe already exists on this day
      let checkQuery = supabase
        .from('day_plans')
        .select('id, servings')
        .eq('day_of_week', dayOfWeek)
        .eq('recipe_id', recipeId!);

      if (userId) {
        checkQuery = checkQuery.eq('user_id', userId);
      } else {
        checkQuery = checkQuery.is('user_id', null);
      }

      const { data: existingPlan } = await checkQuery.maybeSingle();

      if (existingPlan) {
        const { data: updatedPlan, error: upPlanErr } = await supabase
          .from('day_plans')
          .update({ servings: Number(existingPlan.servings) + servings })
          .eq('id', existingPlan.id)
          .select('id')
          .single();

        if (upPlanErr) return { success: false, error: upPlanErr.message };
        dayPlanId = updatedPlan?.id;
      } else {
        const { data: newPlan, error: planErr } = await supabase
          .from('day_plans')
          .insert({
            user_id: userId,
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
