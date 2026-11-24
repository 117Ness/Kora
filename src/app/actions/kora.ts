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
import { toBaseUnit } from '@/lib/units';

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
  user_id,
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
      user_id,
      name,
      unit,
      pack_size,
      pack_cost,
      calories_per_unit,
      protein_per_unit,
      carbs_per_unit,
      fats_per_unit,
      weight_per_unit_g,
      stock_quantity,
      created_at
    )
  )
` as const;

const DAY_PLAN_SELECT = `
  id,
  user_id,
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
    const { data: { user } } = await supabase.auth.getUser();

    let dayPlansQuery = supabase
      .from('day_plans')
      .select(DAY_PLAN_SELECT)
      .order('day_of_week', { ascending: true })
      .order('sort_order', { ascending: true });

    let recipesQuery = supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .order('name', { ascending: true });

    if (user) {
      dayPlansQuery = dayPlansQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      recipesQuery = recipesQuery.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      dayPlansQuery = dayPlansQuery.is('user_id', null);
      recipesQuery = recipesQuery.is('user_id', null);
    }

    const [dayPlansRes, recipesRes] = await Promise.all([
      dayPlansQuery,
      recipesQuery,
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
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Check if the (day_of_week, recipe_id) pair already exists for this user/guest
    let existingQuery = supabase
      .from('day_plans')
      .select('id, servings')
      .eq('day_of_week', day_of_week)
      .eq('recipe_id', recipe_id);

    if (userId) {
      existingQuery = existingQuery.eq('user_id', userId);
    } else {
      existingQuery = existingQuery.is('user_id', null);
    }

    const { data: existing, error: fetchErr } = await existingQuery.maybeSingle();
    if (fetchErr) return err(fetchErr.message);

    if (existing) {
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
    let maxQuery = supabase
      .from('day_plans')
      .select('sort_order')
      .eq('day_of_week', day_of_week);

    if (userId) {
      maxQuery = maxQuery.eq('user_id', userId);
    } else {
      maxQuery = maxQuery.is('user_id', null);
    }

    const { data: maxRow } = await maxQuery
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = maxRow ? Number(maxRow.sort_order) + 1 : 0;

    const { data, error } = await supabase
      .from('day_plans')
      .insert({
        user_id: userId,
        day_of_week,
        recipe_id,
        servings: srvs,
        sort_order,
      })
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
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('day_plans')
      .delete()
      .eq('id', parsed.data);

    if (user) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.is('user_id', null);
    }

    const { error } = await query;
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

const createRecipeFullSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required'),
  notes: z.string().trim().nullish(),
  ingredients: z
    .array(
      z.object({
        ingredient_id: z.string().uuid().optional(),
        name: z.string().trim().min(1, 'Ingredient name is required').optional(),
        unit: z.string().trim().min(1, 'Unit is required').optional(),
        pack_size: z.coerce.number().positive().optional(),
        pack_cost: z.coerce.number().min(0).optional(),
        calories_per_unit: z.coerce.number().min(0).optional(),
        protein_per_unit: z.coerce.number().min(0).optional(),
        carbs_per_unit: z.coerce.number().min(0).optional(),
        fats_per_unit: z.coerce.number().min(0).optional(),
        weight_per_unit_g: z.coerce.number().positive().nullish(),
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
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // 1. Insert the recipe
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .insert({
        user_id: userId,
        name,
        notes: notes ?? null,
      })
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
        let canonicalUnit = ing.unit ?? 'g';
        let canonicalPackSize = ing.pack_size ?? 1;
        try {
          if (ing.unit) {
            const normalized = toBaseUnit(ing.pack_size ?? 1, ing.unit);
            canonicalUnit = normalized.unit;
            canonicalPackSize = normalized.value;
          }
        } catch { /* canonical fallback */ }

        const ingParsed = createIngredientSchema.safeParse({
          name: ing.name,
          unit: canonicalUnit,
          pack_size: canonicalPackSize,
          pack_cost: ing.pack_cost,
          calories_per_unit: ing.calories_per_unit ?? 0,
          protein_per_unit: ing.protein_per_unit ?? 0,
          carbs_per_unit: ing.carbs_per_unit ?? 0,
          fats_per_unit: ing.fats_per_unit ?? 0,
          weight_per_unit_g: ing.weight_per_unit_g ?? null,
        });
        if (!ingParsed.success) return zodErr(ingParsed.error);

        const normalizedName = ingParsed.data.name.toLowerCase().trim();

        let findQuery = supabase
          .from('ingredients')
          .select('id')
          .ilike('name', normalizedName);

        if (userId) {
          findQuery = findQuery.or(`user_id.eq.${userId},user_id.is.null`);
        } else {
          findQuery = findQuery.is('user_id', null);
        }

        const { data: existing, error: findErr } = await findQuery.maybeSingle();
        if (findErr) return err(findErr.message);

        if (existing) {
          // Update details if owned
          let upQuery = supabase
            .from('ingredients')
            .update({
              unit: ingParsed.data.unit,
              pack_size: ingParsed.data.pack_size,
              pack_cost: ingParsed.data.pack_cost,
              calories_per_unit: ingParsed.data.calories_per_unit,
              protein_per_unit: ingParsed.data.protein_per_unit,
              carbs_per_unit: ingParsed.data.carbs_per_unit,
              fats_per_unit: ingParsed.data.fats_per_unit,
              weight_per_unit_g: ingParsed.data.weight_per_unit_g ?? null,
            })
            .eq('id', existing.id);

          if (userId) {
            upQuery = upQuery.eq('user_id', userId);
          } else {
            upQuery = upQuery.is('user_id', null);
          }
          await upQuery; // best-effort
          ingredientId = existing.id;
        } else {
          const { data: newIng, error: createErr } = await supabase
            .from('ingredients')
            .insert({
              user_id: userId,
              name: ingParsed.data.name,
              unit: ingParsed.data.unit,
              pack_size: ingParsed.data.pack_size,
              pack_cost: ingParsed.data.pack_cost,
              calories_per_unit: ingParsed.data.calories_per_unit,
              protein_per_unit: ingParsed.data.protein_per_unit,
              carbs_per_unit: ingParsed.data.carbs_per_unit,
              fats_per_unit: ingParsed.data.fats_per_unit,
              weight_per_unit_g: ingParsed.data.weight_per_unit_g ?? null,
              stock_quantity: 0,
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
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    let plansQuery = supabase
      .from('day_plans')
      .select(DAY_PLAN_SELECT)
      .eq('day_of_week', day_of_week);

    if (userId) {
      plansQuery = plansQuery.or(`user_id.eq.${userId},user_id.is.null`);
    } else {
      plansQuery = plansQuery.is('user_id', null);
    }

    const { data: plans, error: plansErr } = await plansQuery;
    if (plansErr) return err(plansErr.message);
    if (!plans || plans.length === 0) {
      return ok({ logsInserted: 0, logs: [] });
    }

    const logRows: {
      user_id: string | null;
      log_date: string;
      ingredient_id: string;
      quantity_consumed: number;
      computed_cost: number;
      health_score: number | null;
    }[] = [];

    for (const plan of plans) {
      const servings = Number(plan.servings);
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
          user_id: userId,
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

    // Decrement stock_quantity
    for (const logRow of logRows) {
      await supabase.rpc('decrement_stock', {
        p_ingredient_id: logRow.ingredient_id,
        p_quantity: logRow.quantity_consumed,
      }).then(({ error }) => {
        if (error) console.warn(`Failed to decrement stock for ${logRow.ingredient_id}:`, error.message);
      });
    }

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
    const { data: { user } } = await supabase.auth.getUser();

    let recipesQuery = supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .order('name', { ascending: true });

    let ingredientsQuery = supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (user) {
      recipesQuery = recipesQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      ingredientsQuery = ingredientsQuery.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      recipesQuery = recipesQuery.is('user_id', null);
      ingredientsQuery = ingredientsQuery.is('user_id', null);
    }

    const [recipesRes, ingredientsRes] = await Promise.all([
      recipesQuery,
      ingredientsQuery,
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
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('recipes')
      .update({
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
      })
      .eq('id', parsed.data.id);

    if (user) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.is('user_id', null);
    }

    const { data: updated, error: updateErr } = await query
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
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('recipes')
      .delete()
      .eq('id', parsed.data);

    if (user) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.is('user_id', null);
    }

    const { error: delErr } = await query;
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
  protein_per_unit: z.coerce.number().min(0, 'Protein must be >= 0').optional(),
  carbs_per_unit: z.coerce.number().min(0, 'Carbs must be >= 0').optional(),
  fats_per_unit: z.coerce.number().min(0, 'Fats must be >= 0').optional(),
  weight_per_unit_g: z.coerce.number().positive().nullish(),
  stock_quantity: z.coerce.number().min(0).optional(),
});

export async function updateIngredient(
  id: string,
  data: {
    name?: string;
    unit?: string;
    pack_size?: number;
    pack_cost?: number;
    calories_per_unit?: number;
    protein_per_unit?: number;
    carbs_per_unit?: number;
    fats_per_unit?: number;
    weight_per_unit_g?: number | null;
    stock_quantity?: number;
  },
): Promise<ActionResult<Ingredient>> {
  const parsed = updateIngredientActionSchema.safeParse({ id, ...data });
  if (!parsed.success) return zodErr(parsed.error);

  const { id: ingId, ...updateFields } = parsed.data;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('ingredients')
      .update(updateFields)
      .eq('id', ingId);

    if (user) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.is('user_id', null);
    }

    const { data: updated, error: updateErr } = await query
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
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('ingredients')
      .delete()
      .eq('id', parsed.data);

    if (user) {
      query = query.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      query = query.is('user_id', null);
    }

    const { error: delErr } = await query;
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
    protein_per_unit?: number;
    carbs_per_unit?: number;
    fats_per_unit?: number;
    weight_per_unit_g?: number | null;
    stock_quantity?: number;
  },
): Promise<ActionResult<Ingredient>> {
  let canonicalUnit = input.unit;
  let canonicalPackSize = input.pack_size;
  try {
    const normalized = toBaseUnit(input.pack_size, input.unit);
    canonicalUnit = normalized.unit;
    canonicalPackSize = normalized.value;
  } catch {
    // leave as-is
  }

  const parsed = createIngredientSchema.safeParse({
    name: input.name,
    unit: canonicalUnit,
    pack_size: canonicalPackSize,
    pack_cost: input.pack_cost,
    calories_per_unit: input.calories_per_unit ?? 0,
    protein_per_unit: input.protein_per_unit ?? 0,
    carbs_per_unit: input.carbs_per_unit ?? 0,
    fats_per_unit: input.fats_per_unit ?? 0,
    weight_per_unit_g: input.weight_per_unit_g,
    stock_quantity: input.stock_quantity ?? 0,
  });
  if (!parsed.success) return zodErr(parsed.error);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const { data: created, error: createErr } = await supabase
      .from('ingredients')
      .insert({
        user_id: userId,
        name: parsed.data.name,
        unit: parsed.data.unit,
        pack_size: parsed.data.pack_size,
        pack_cost: parsed.data.pack_cost,
        calories_per_unit: parsed.data.calories_per_unit ?? 0,
        protein_per_unit: parsed.data.protein_per_unit ?? 0,
        carbs_per_unit: parsed.data.carbs_per_unit ?? 0,
        fats_per_unit: parsed.data.fats_per_unit ?? 0,
        weight_per_unit_g: parsed.data.weight_per_unit_g ?? null,
        stock_quantity: parsed.data.stock_quantity ?? 0,
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
    const { data: { user } } = await supabase.auth.getUser();

    let logsQuery = supabase
      .from('consumption_logs')
      .select('*')
      .order('log_date', { ascending: true });

    let ingredientsQuery = supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    let dayPlansQuery = supabase
      .from('day_plans')
      .select(DAY_PLAN_SELECT)
      .order('day_of_week', { ascending: true })
      .order('sort_order', { ascending: true });

    if (user) {
      logsQuery = logsQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      ingredientsQuery = ingredientsQuery.or(`user_id.eq.${user.id},user_id.is.null`);
      dayPlansQuery = dayPlansQuery.or(`user_id.eq.${user.id},user_id.is.null`);
    } else {
      logsQuery = logsQuery.is('user_id', null);
      ingredientsQuery = ingredientsQuery.is('user_id', null);
      dayPlansQuery = dayPlansQuery.is('user_id', null);
    }

    const [logsRes, ingredientsRes, dayPlansRes] = await Promise.all([
      logsQuery,
      ingredientsQuery,
      dayPlansQuery,
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
