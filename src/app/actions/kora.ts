'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createIngredientSchema,
} from '@/lib/validators';
import type {
  ConsumptionLog,
  DayPlan,
  DayPlanWithRecipe,
  Ingredient,
  Recipe,
  RecipeWithIngredients,
} from '@/types/kora';
import {
  computeInsightsAnalytics,
  type InsightsAnalytics,
} from '@/lib/analytics';

// =============================================================
// Generic response envelope
// =============================================================

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function err(message: string): ActionResult<never> {
  return { success: false, error: message };
}

function zodErr(e: z.ZodError): ActionResult<never> {
  return err(e.issues.map((issue) => issue.message).join('; '));
}

// =============================================================
// Supabase nested-select strings (kept as constants for DRY-ness)
// =============================================================

const RECIPE_SELECT = `
  id,
  name,
  notes,
  created_at,
  recipe_ingredients (
    id,
    recipe_id,
    ingredient_id,
    quantity_used,
    ingredient:ingredients (
      id,
      name,
      unit,
      pack_size,
      pack_cost,
      calories_per_unit,
      created_at
    )
  )
` as const;

const DAY_PLAN_SELECT = `
  id,
  day_of_week,
  recipe_id,
  servings,
  sort_order,
  recipe:recipes (
    ${RECIPE_SELECT}
  )
` as const;

// =============================================================
// 1. getPlannerData
// =============================================================

export type PlannerData = {
  dayPlans: DayPlanWithRecipe[];
  recipes: RecipeWithIngredients[];
};

export async function getPlannerData(): Promise<ActionResult<PlannerData>> {
  try {
    const supabase = await createClient();

    const [dayPlansRes, recipesRes] = await Promise.all([
      supabase
        .from('day_plans')
        .select(DAY_PLAN_SELECT)
        .order('day_of_week', { ascending: true })
        .order('sort_order', { ascending: true }),
      supabase
        .from('recipes')
        .select(RECIPE_SELECT)
        .order('name', { ascending: true }),
    ]);

    if (dayPlansRes.error) return err(dayPlansRes.error.message);
    if (recipesRes.error) return err(recipesRes.error.message);

    return ok({
      dayPlans: (dayPlansRes.data ?? []) as unknown as DayPlanWithRecipe[],
      recipes: (recipesRes.data ?? []) as unknown as RecipeWithIngredients[],
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to load planner data');
  }
}

// =============================================================
// 2. addRecipeToDay
// =============================================================

const addRecipeToDaySchema = z.object({
  dayOfWeek: z.coerce
    .number()
    .int()
    .min(0)
    .max(6, 'Day of week must be between 0 and 6'),
  recipeId: z.string().uuid('Invalid recipe UUID'),
  servings: z.coerce.number().positive().default(1),
});

export async function addRecipeToDay(
  dayOfWeek: number,
  recipeId: string,
  servings: number = 1,
): Promise<ActionResult<DayPlan>> {
  const parsed = addRecipeToDaySchema.safeParse({ dayOfWeek, recipeId, servings });
  if (!parsed.success) return zodErr(parsed.error);

  const { dayOfWeek: day_of_week, recipeId: recipe_id, servings: srvs } = parsed.data;

  try {
    const supabase = await createClient();

    // Check if the (day_of_week, recipe_id) pair already exists
    const { data: existing, error: fetchErr } = await supabase
      .from('day_plans')
      .select('id, servings')
      .eq('day_of_week', day_of_week)
      .eq('recipe_id', recipe_id)
      .maybeSingle();

    if (fetchErr) return err(fetchErr.message);

    if (existing) {
      // Increment servings on the existing plan
      const newServings = Number(existing.servings) + srvs;
      const { data, error } = await supabase
        .from('day_plans')
        .update({ servings: newServings })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) return err(error.message);
      revalidatePath('/');
      return ok(data as DayPlan);
    }

    // Determine sort_order: max(sort_order) + 1 for that day
    const { data: maxRow } = await supabase
      .from('day_plans')
      .select('sort_order')
      .eq('day_of_week', day_of_week)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = maxRow ? Number(maxRow.sort_order) + 1 : 0;

    const { data, error } = await supabase
      .from('day_plans')
      .insert({ day_of_week, recipe_id, servings: srvs, sort_order })
      .select()
      .single();

    if (error) return err(error.message);
    revalidatePath('/');
    return ok(data as DayPlan);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to add recipe to day');
  }
}

// =============================================================
// 3. removeRecipeFromDay
// =============================================================

export async function removeRecipeFromDay(
  dayPlanId: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = z.string().uuid('Invalid day plan UUID').safeParse(dayPlanId);
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('day_plans')
      .delete()
      .eq('id', parsed.data);

    if (error) return err(error.message);
    revalidatePath('/');
    return ok({ id: parsed.data });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to remove recipe from day');
  }
}

// =============================================================
// 4. createRecipeWithIngredients
// =============================================================

// Extended schema: ingredients with full ingredient data (not just UUID)
const createRecipeFullSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required'),
  notes: z.string().trim().nullish(),
  ingredients: z
    .array(
      z.object({
        // Supply either an existing ingredient UUID or the data to create/upsert one
        ingredient_id: z.string().uuid().optional(),
        name: z.string().trim().min(1, 'Ingredient name is required').optional(),
        unit: z.string().trim().min(1, 'Unit is required').optional(),
        pack_size: z.coerce.number().positive().optional(),
        pack_cost: z.coerce.number().min(0).optional(),
        calories_per_unit: z.coerce.number().min(0).optional(),
        quantity_used: z.coerce.number().positive('Quantity used must be > 0'),
      }),
    )
    .optional(),
});

export type CreateRecipeFullInput = z.infer<typeof createRecipeFullSchema>;

export async function createRecipeWithIngredients(
  input: CreateRecipeFullInput,
): Promise<ActionResult<RecipeWithIngredients>> {
  const parsed = createRecipeFullSchema.safeParse(input);
  if (!parsed.success) return zodErr(parsed.error);
  const { name, notes, ingredients } = parsed.data;

  try {
    const supabase = await createClient();

    // 1. Insert the recipe
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .insert({ name, notes: notes ?? null })
      .select()
      .single();

    if (recipeErr) return err(recipeErr.message);

    if (!ingredients || ingredients.length === 0) {
      revalidatePath('/');
      revalidatePath('/library');
      return ok({ ...(recipe as Recipe), recipe_ingredients: [] });
    }

    // 2. Upsert / resolve each ingredient
    const resolvedLinks: { ingredient_id: string; quantity_used: number }[] = [];

    for (const ing of ingredients) {
      let ingredientId = ing.ingredient_id;

      if (!ingredientId) {
        // Must have enough data to create/upsert
        const ingParsed = createIngredientSchema.safeParse({
          name: ing.name,
          unit: ing.unit,
          pack_size: ing.pack_size,
          pack_cost: ing.pack_cost,
          calories_per_unit: ing.calories_per_unit ?? 0,
        });
        if (!ingParsed.success) return zodErr(ingParsed.error);

        const normalizedName = ingParsed.data.name.toLowerCase().trim();

        // Try to find existing ingredient by normalised name
        const { data: existing, error: findErr } = await supabase
          .from('ingredients')
          .select('id')
          .ilike('name', normalizedName)
          .maybeSingle();

        if (findErr) return err(findErr.message);

        if (existing) {
          // Update pack info if changed
          const { error: upErr } = await supabase
            .from('ingredients')
            .update({
              unit: ingParsed.data.unit,
              pack_size: ingParsed.data.pack_size,
              pack_cost: ingParsed.data.pack_cost,
              calories_per_unit: ingParsed.data.calories_per_unit,
            })
            .eq('id', existing.id);
          if (upErr) return err(upErr.message);
          ingredientId = existing.id;
        } else {
          // Create new ingredient
          const { data: newIng, error: createErr } = await supabase
            .from('ingredients')
            .insert({
              name: ingParsed.data.name,
              unit: ingParsed.data.unit,
              pack_size: ingParsed.data.pack_size,
              pack_cost: ingParsed.data.pack_cost,
              calories_per_unit: ingParsed.data.calories_per_unit,
            })
            .select('id')
            .single();
          if (createErr) return err(createErr.message);
          ingredientId = newIng.id as string;
        }
      }

      resolvedLinks.push({
        ingredient_id: ingredientId as string,
        quantity_used: ing.quantity_used,
      });
    }

    // 3. Insert recipe_ingredients
    const { error: riErr } = await supabase.from('recipe_ingredients').insert(
      resolvedLinks.map((l) => ({
        recipe_id: recipe.id as string,
        ingredient_id: l.ingredient_id,
        quantity_used: l.quantity_used,
      })),
    );

    if (riErr) return err(riErr.message);

    // 4. Fetch the full recipe with relations to return
    const { data: fullRecipe, error: fetchErr } = await supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .eq('id', recipe.id as string)
      .single();

    if (fetchErr) return err(fetchErr.message);

    revalidatePath('/');
    revalidatePath('/library');
    return ok(fullRecipe as unknown as RecipeWithIngredients);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create recipe');
  }
}

// =============================================================
// 5. logDayConsumption
// =============================================================

const logDayConsumptionSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  logDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'logDate must be YYYY-MM-DD')
    .default(() => new Date().toISOString().slice(0, 10)),
  healthScore: z.coerce.number().min(0).max(100).nullish(),
});

export type LogDayConsumptionResult = {
  logsInserted: number;
  logs: ConsumptionLog[];
};

export async function logDayConsumption(
  dayOfWeek: number,
  logDate?: string,
  healthScore?: number | null,
): Promise<ActionResult<LogDayConsumptionResult>> {
  const parsed = logDayConsumptionSchema.safeParse({
    dayOfWeek,
    logDate,
    healthScore,
  });
  if (!parsed.success) return zodErr(parsed.error);

  const {
    dayOfWeek: day_of_week,
    logDate: log_date,
    healthScore: health_score,
  } = parsed.data;

  try {
    const supabase = await createClient();

    // Fetch all day_plans for this day, joined with recipe_ingredients and ingredients
    const { data: plans, error: plansErr } = await supabase
      .from('day_plans')
      .select(DAY_PLAN_SELECT)
      .eq('day_of_week', day_of_week);

    if (plansErr) return err(plansErr.message);
    if (!plans || plans.length === 0) {
      return ok({ logsInserted: 0, logs: [] });
    }

    // Build consumption log rows
    const logRows: {
      log_date: string;
      ingredient_id: string;
      quantity_consumed: number;
      computed_cost: number;
      health_score: number | null;
    }[] = [];

    for (const plan of plans) {
      const servings = Number(plan.servings);
      // recipe_ingredients come back nested under plan.recipe.recipe_ingredients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recipeIngredients: any[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (plan as any).recipe?.recipe_ingredients ?? [];

      for (const ri of recipeIngredients) {
        const ing: Ingredient = ri.ingredient;
        if (!ing) continue;

        const quantity_consumed = Number(ri.quantity_used) * servings;
        const cost_per_unit =
          ing.pack_size > 0 ? ing.pack_cost / ing.pack_size : 0;
        const computed_cost = parseFloat(
          (quantity_consumed * cost_per_unit).toFixed(4),
        );

        logRows.push({
          log_date,
          ingredient_id: ing.id,
          quantity_consumed,
          computed_cost,
          health_score: health_score ?? null,
        });
      }
    }

    if (logRows.length === 0) {
      return ok({ logsInserted: 0, logs: [] });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('consumption_logs')
      .insert(logRows)
      .select();

    if (insertErr) return err(insertErr.message);

    revalidatePath('/insights');
    return ok({
      logsInserted: inserted?.length ?? 0,
      logs: (inserted ?? []) as ConsumptionLog[],
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to log consumption');
  }
}

// =============================================================
// 6. getLibraryData
// =============================================================

export type LibraryData = {
  recipes: RecipeWithIngredients[];
  ingredients: Ingredient[];
};

export async function getLibraryData(): Promise<ActionResult<LibraryData>> {
  try {
    const supabase = await createClient();

    const [recipesRes, ingredientsRes] = await Promise.all([
      supabase
        .from('recipes')
        .select(RECIPE_SELECT)
        .order('name', { ascending: true }),
      supabase
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true }),
    ]);

    if (recipesRes.error) return err(recipesRes.error.message);
    if (ingredientsRes.error) return err(ingredientsRes.error.message);

    return ok({
      recipes: (recipesRes.data ?? []) as unknown as RecipeWithIngredients[],
      ingredients: (ingredientsRes.data ?? []) as unknown as Ingredient[],
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to load library data');
  }
}

// =============================================================
// 7. updateRecipe
// =============================================================

const updateRecipeDetailsSchema = z.object({
  id: z.string().uuid('Invalid recipe UUID'),
  name: z.string().trim().min(1, 'Recipe name is required'),
  notes: z.string().trim().nullish(),
});

export async function updateRecipe(
  id: string,
  data: { name: string; notes?: string | null },
): Promise<ActionResult<Recipe>> {
  const parsed = updateRecipeDetailsSchema.safeParse({ id, ...data });
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const supabase = await createClient();

    const { data: updated, error: updateErr } = await supabase
      .from('recipes')
      .update({
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
      })
      .eq('id', parsed.data.id)
      .select()
      .single();

    if (updateErr) return err(updateErr.message);

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok(updated as Recipe);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update recipe');
  }
}

// =============================================================
// 8. deleteRecipe
// =============================================================

export async function deleteRecipe(
  recipeId: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = z.string().uuid('Invalid recipe UUID').safeParse(recipeId);
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const supabase = await createClient();

    const { error: delErr } = await supabase
      .from('recipes')
      .delete()
      .eq('id', parsed.data);

    if (delErr) return err(delErr.message);

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok({ id: parsed.data });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to delete recipe');
  }
}

// =============================================================
// 9. updateIngredient
// =============================================================

const updateIngredientActionSchema = z.object({
  id: z.string().uuid('Invalid ingredient UUID'),
  name: z.string().trim().min(1, 'Ingredient name is required').optional(),
  unit: z.string().trim().min(1, 'Unit is required').optional(),
  pack_size: z.coerce.number().positive('Pack size must be greater than 0').optional(),
  pack_cost: z.coerce.number().min(0, 'Pack cost must be >= 0').optional(),
  calories_per_unit: z.coerce.number().min(0, 'Calories must be >= 0').optional(),
});

export async function updateIngredient(
  id: string,
  data: {
    name?: string;
    unit?: string;
    pack_size?: number;
    pack_cost?: number;
    calories_per_unit?: number;
  },
): Promise<ActionResult<Ingredient>> {
  const parsed = updateIngredientActionSchema.safeParse({ id, ...data });
  if (!parsed.success) return zodErr(parsed.error);

  const { id: ingId, ...updateFields } = parsed.data;

  try {
    const supabase = await createClient();

    const { data: updated, error: updateErr } = await supabase
      .from('ingredients')
      .update(updateFields)
      .eq('id', ingId)
      .select()
      .single();

    if (updateErr) return err(updateErr.message);

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok(updated as Ingredient);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update ingredient');
  }
}

// =============================================================
// 10. deleteIngredient
// =============================================================

export async function deleteIngredient(
  ingredientId: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = z.string().uuid('Invalid ingredient UUID').safeParse(ingredientId);
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const supabase = await createClient();

    const { error: delErr } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', parsed.data);

    if (delErr) return err(delErr.message);

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok({ id: parsed.data });
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to delete ingredient');
  }
}

// =============================================================
// 11. createIngredient
// =============================================================

export async function createIngredient(
  input: {
    name: string;
    unit: string;
    pack_size: number;
    pack_cost: number;
    calories_per_unit?: number;
  },
): Promise<ActionResult<Ingredient>> {
  const parsed = createIngredientSchema.safeParse(input);
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const supabase = await createClient();

    const { data: created, error: createErr } = await supabase
      .from('ingredients')
      .insert({
        name: parsed.data.name,
        unit: parsed.data.unit,
        pack_size: parsed.data.pack_size,
        pack_cost: parsed.data.pack_cost,
        calories_per_unit: parsed.data.calories_per_unit ?? 0,
      })
      .select()
      .single();

    if (createErr) return err(createErr.message);

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok(created as Ingredient);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to create ingredient');
  }
}

// =============================================================
// 12. getInsightsData
// =============================================================

export type InsightsData = InsightsAnalytics;

export async function getInsightsData(): Promise<ActionResult<InsightsAnalytics>> {
  try {
    const supabase = await createClient();

    const [logsRes, ingredientsRes, dayPlansRes] = await Promise.all([
      supabase
        .from('consumption_logs')
        .select('*')
        .order('log_date', { ascending: true }),
      supabase
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true }),
      supabase
        .from('day_plans')
        .select(DAY_PLAN_SELECT)
        .order('day_of_week', { ascending: true })
        .order('sort_order', { ascending: true }),
    ]);

    if (logsRes.error) return err(logsRes.error.message);
    if (ingredientsRes.error) return err(ingredientsRes.error.message);
    if (dayPlansRes.error) return err(dayPlansRes.error.message);

    const analytics = computeInsightsAnalytics(
      (logsRes.data ?? []) as ConsumptionLog[],
      (ingredientsRes.data ?? []) as Ingredient[],
      (dayPlansRes.data ?? []) as unknown as DayPlanWithRecipe[],
    );

    return ok(analytics);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to load insights data');
  }
}
