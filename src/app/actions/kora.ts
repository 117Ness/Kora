'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createIngredientSchema } from '@/lib/validators';
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
// Generic response envelope & auth/query helpers
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

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

const AUTH_REQUIRED_MSG =
  'Please sign in (via Kitchen & Goals) to save or modify your kitchen data.';

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: AUTH_REQUIRED_MSG } as const;
  }

  return { supabase, user, error: null } as const;
}

// =============================================================
// Supabase nested-select strings (kept as constants for DRY-ness)
// =============================================================

const RECIPE_SELECT = `
  id,
  user_id,
  is_public,
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
      is_public,
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let recipesQuery = supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .order('name', { ascending: true });

    if (user) {
      recipesQuery = recipesQuery.or(
        `user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`
      );

      const dayPlansQuery = supabase
        .from('day_plans')
        .select(DAY_PLAN_SELECT)
        .eq('user_id', user.id)
        .order('day_of_week', { ascending: true })
        .order('sort_order', { ascending: true });

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
    }

    // Unauthenticated guests see no personal day plans and only explicitly public starter templates
    const recipesRes = await recipesQuery.is('user_id', null).eq('is_public', true);
    if (recipesRes.error) return err(recipesRes.error.message);

    return ok({
      dayPlans: [],
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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    // Check if the (day_of_week, recipe_id) pair already exists for this user
    const { data: existing, error: fetchErr } = await supabase
      .from('day_plans')
      .select('id, servings')
      .eq('user_id', user.id)
      .eq('day_of_week', day_of_week)
      .eq('recipe_id', recipe_id)
      .maybeSingle();

    if (fetchErr) return err(fetchErr.message);

    if (existing) {
      const newServings = Number(existing.servings) + srvs;
      const { data, error } = await supabase
        .from('day_plans')
        .update({ servings: newServings })
        .eq('id', existing.id)
        .eq('user_id', user.id)
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
      .eq('user_id', user.id)
      .eq('day_of_week', day_of_week)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort_order = maxRow ? Number(maxRow.sort_order) + 1 : 0;

    const { data, error } = await supabase
      .from('day_plans')
      .insert({
        user_id: user.id,
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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: deleted, error } = await supabase
      .from('day_plans')
      .delete()
      .eq('id', parsed.data)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) return err(error.message);
    if (!deleted) return err('Meal plan entry not found or unauthorized.');

    revalidatePath('/');
    return ok({ id: deleted.id as string });
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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    // 1. Insert the user-owned recipe
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        is_public: false,
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

    // 2. Resolve or create each ingredient strictly within user scope (or read-only public template)
    const resolvedLinks: { ingredient_id: string; quantity_used: number }[] = [];

    for (const ing of ingredients) {
      let ingredientId = ing.ingredient_id;

      if (ingredientId) {
        // Verify ingredient is accessible (owned by user or public template)
        const { data: accessibleIng, error: checkErr } = await supabase
          .from('ingredients')
          .select('id')
          .eq('id', ingredientId)
          .or(`user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`)
          .maybeSingle();

        if (checkErr) return err(checkErr.message);
        if (!accessibleIng) {
          return err('Referenced ingredient was not found or is unauthorized.');
        }
      } else {
        let canonicalUnit = ing.unit ?? 'g';
        let canonicalPackSize = ing.pack_size ?? 1;
        if (ing.unit) {
          try {
            const normalized = toBaseUnit(ing.pack_size ?? 1, ing.unit);
            canonicalUnit = normalized.unit;
            canonicalPackSize = normalized.value;
          } catch (unitErr) {
            return err(
              unitErr instanceof Error
                ? unitErr.message
                : `Unsupported unit "${ing.unit}"`
            );
          }
        }

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
        const escapedName = escapeIlikePattern(normalizedName);

        // Prefer the user's own ingredient first, otherwise fall back to a public template
        const { data: existingOwn, error: findOwnErr } = await supabase
          .from('ingredients')
          .select('id')
          .eq('user_id', user.id)
          .ilike('name', escapedName)
          .maybeSingle();

        if (findOwnErr) return err(findOwnErr.message);

        if (existingOwn) {
          const { error: upErr } = await supabase
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
            .eq('id', existingOwn.id)
            .eq('user_id', user.id);

          if (upErr) return err(upErr.message);
          ingredientId = existingOwn.id;
        } else {
          const { data: newIng, error: createErr } = await supabase
            .from('ingredients')
            .insert({
              user_id: user.id,
              is_public: false,
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
      .eq('user_id', user.id)
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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: plans, error: plansErr } = await supabase
      .from('day_plans')
      .select(DAY_PLAN_SELECT)
      .eq('user_id', user.id)
      .eq('day_of_week', day_of_week);

    if (plansErr) return err(plansErr.message);
    if (!plans || plans.length === 0) {
      return ok({ logsInserted: 0, logs: [] });
    }

    const logRows: {
      user_id: string;
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
          user_id: user.id,
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

    // Decrement stock_quantity only on caller-owned ingredients (enforced by RPC + RLS)
    for (const logRow of logRows) {
      await supabase
        .rpc('decrement_stock', {
          p_ingredient_id: logRow.ingredient_id,
          p_quantity: logRow.quantity_consumed,
        })
        .then(({ error }) => {
          if (error) {
            console.warn(
              `Failed to decrement stock for ${logRow.ingredient_id}:`,
              error.message
            );
          }
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let recipesQuery = supabase
      .from('recipes')
      .select(RECIPE_SELECT)
      .order('name', { ascending: true });

    let ingredientsQuery = supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (user) {
      recipesQuery = recipesQuery.or(
        `user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`
      );
      ingredientsQuery = ingredientsQuery.or(
        `user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`
      );
    } else {
      recipesQuery = recipesQuery.is('user_id', null).eq('is_public', true);
      ingredientsQuery = ingredientsQuery.is('user_id', null).eq('is_public', true);
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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: updated, error: updateErr } = await supabase
      .from('recipes')
      .update({
        name: parsed.data.name,
        notes: parsed.data.notes ?? null,
      })
      .eq('id', parsed.data.id)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (updateErr) return err(updateErr.message);
    if (!updated) {
      return err('Recipe not found, or starter templates cannot be edited directly.');
    }

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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: deleted, error: delErr } = await supabase
      .from('recipes')
      .delete()
      .eq('id', parsed.data)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (delErr) return err(delErr.message);
    if (!deleted) {
      return err('Recipe not found, or starter templates cannot be deleted.');
    }

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok({ id: deleted.id as string });
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
  unit: z
    .enum(['g', 'ml', 'pcs'], {
      message: 'Unit must be normalized to g, ml, or pcs',
    })
    .optional(),
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
  let normalizedUnit = data.unit;
  let normalizedPackSize = data.pack_size;

  if (data.unit !== undefined) {
    try {
      const normalized = toBaseUnit(data.pack_size ?? 1, data.unit);
      normalizedUnit = normalized.unit;
      if (data.pack_size !== undefined) {
        normalizedPackSize = normalized.value;
      }
    } catch (unitErr) {
      return err(
        unitErr instanceof Error ? unitErr.message : `Unsupported unit "${data.unit}"`
      );
    }
  }

  const parsed = updateIngredientActionSchema.safeParse({
    id,
    ...data,
    ...(normalizedUnit !== undefined ? { unit: normalizedUnit } : {}),
    ...(normalizedPackSize !== undefined ? { pack_size: normalizedPackSize } : {}),
  });
  if (!parsed.success) return zodErr(parsed.error);

  const { id: ingId, ...updateFields } = parsed.data;

  try {
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: updated, error: updateErr } = await supabase
      .from('ingredients')
      .update(updateFields)
      .eq('id', ingId)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();

    if (updateErr) return err(updateErr.message);
    if (!updated) {
      return err('Ingredient not found, or starter templates cannot be edited directly.');
    }

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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: deleted, error: delErr } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', parsed.data)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (delErr) return err(delErr.message);
    if (!deleted) {
      return err('Ingredient not found, or starter templates cannot be deleted.');
    }

    revalidatePath('/library');
    revalidatePath('/');
    revalidatePath('/insights');
    return ok({ id: deleted.id as string });
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
  } catch (unitErr) {
    return err(
      unitErr instanceof Error ? unitErr.message : `Unsupported unit "${input.unit}"`
    );
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
    const { supabase, user, error: authErr } = await requireAuth();
    if (!user) return err(authErr);

    const { data: created, error: createErr } = await supabase
      .from('ingredients')
      .insert({
        user_id: user.id,
        is_public: false,
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return ok(computeInsightsAnalytics([], [], []));
    }

    const logsQuery = supabase
      .from('consumption_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('log_date', { ascending: true });

    const ingredientsQuery = supabase
      .from('ingredients')
      .select('*')
      .or(`user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`)
      .order('name', { ascending: true });

    const dayPlansQuery = supabase
      .from('day_plans')
      .select(DAY_PLAN_SELECT)
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('sort_order', { ascending: true });

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
