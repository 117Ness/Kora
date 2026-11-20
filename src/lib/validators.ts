import { z } from 'zod';

// =============================================================
// Ingredient Validators
// =============================================================

export const createIngredientSchema = z.object({
  name: z.string().trim().min(1, 'Ingredient name is required'),
  unit: z.string().trim().min(1, 'Unit of measurement is required'),
  pack_size: z.coerce.number().positive('Pack size must be greater than 0'),
  pack_cost: z.coerce.number().min(0, 'Pack cost must be 0 or greater'),
  calories_per_unit: z.coerce
    .number()
    .min(0, 'Calories per unit must be 0 or greater')
    .default(0),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export const ingredientSchema = createIngredientSchema;

export type CreateIngredientData = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientData = z.infer<typeof updateIngredientSchema>;

// =============================================================
// Recipe & Recipe-Ingredient Junction Validators
// =============================================================

export const recipeIngredientInputSchema = z.object({
  ingredient_id: z.string().uuid('Invalid ingredient UUID'),
  quantity_used: z.coerce.number().positive('Quantity used must be greater than 0'),
});

export const createRecipeIngredientSchema = z.object({
  recipe_id: z.string().uuid('Invalid recipe UUID'),
  ingredient_id: z.string().uuid('Invalid ingredient UUID'),
  quantity_used: z.coerce.number().positive('Quantity used must be greater than 0'),
});

export const updateRecipeIngredientSchema = createRecipeIngredientSchema.partial();

export const createRecipeSchema = z.object({
  name: z.string().trim().min(1, 'Recipe name is required'),
  notes: z.string().trim().nullish(),
  ingredients: z.array(recipeIngredientInputSchema).optional(),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const recipeSchema = createRecipeSchema;

export type RecipeIngredientInputData = z.infer<typeof recipeIngredientInputSchema>;
export type CreateRecipeIngredientData = z.infer<typeof createRecipeIngredientSchema>;
export type UpdateRecipeIngredientData = z.infer<typeof updateRecipeIngredientSchema>;
export type CreateRecipeData = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeData = z.infer<typeof updateRecipeSchema>;

// =============================================================
// Day Plan Validators
// =============================================================

export const createDayPlanSchema = z.object({
  day_of_week: z.coerce
    .number()
    .int('Day of week must be an integer')
    .min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
    .max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'),
  recipe_id: z.string().uuid('Invalid recipe UUID'),
  servings: z.coerce.number().positive('Servings must be greater than 0').default(1),
  sort_order: z.coerce.number().int().default(0),
});

export const updateDayPlanSchema = createDayPlanSchema.partial();

export const dayPlanSchema = createDayPlanSchema;

export type CreateDayPlanData = z.infer<typeof createDayPlanSchema>;
export type UpdateDayPlanData = z.infer<typeof updateDayPlanSchema>;

// =============================================================
// Consumption Log Validators
// =============================================================

export const createConsumptionLogSchema = z.object({
  log_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Log date must be in YYYY-MM-DD format')
    .default(() => new Date().toISOString().slice(0, 10)),
  ingredient_id: z.string().uuid('Invalid ingredient UUID'),
  quantity_consumed: z.coerce
    .number()
    .positive('Quantity consumed must be greater than 0'),
  computed_cost: z.coerce
    .number()
    .min(0, 'Computed cost must be 0 or greater')
    .default(0),
  health_score: z.coerce
    .number()
    .min(0, 'Health score must be between 0 and 100')
    .max(100, 'Health score must be between 0 and 100')
    .nullish(),
});

export const updateConsumptionLogSchema = createConsumptionLogSchema.partial();

export const consumptionLogSchema = createConsumptionLogSchema;

export type CreateConsumptionLogData = z.infer<typeof createConsumptionLogSchema>;
export type UpdateConsumptionLogData = z.infer<typeof updateConsumptionLogSchema>;
