import { tool } from 'ai';
import { z } from 'zod';
import type {
  MacroMealPlanPayload,
  ProposedRecipePayload,
  ScaledRecipePayload,
} from '@/types/ai';

const proposedIngredientSchema = z.object({
  name: z.string().trim().min(1).describe('Canonical ingredient name (e.g. "Eggs", "Onion", "Mustard Oil")'),
  quantity: z.number().positive().describe('Quantity in canonical base unit (g, ml, or pcs)'),
  unit: z.enum(['g', 'ml', 'pcs']).describe('Canonical base unit strictly g, ml, or pcs'),
  weight_per_unit_g: z
    .number()
    .positive()
    .nullish()
    .describe('Grams per piece if unit is pcs (e.g. egg=50, onion=80, tomato=90, lemon=40)'),
  calories: z.number().min(0).describe('Total calories from this ingredient in kcal'),
  protein_g: z.number().min(0).describe('Protein content in grams'),
  carbs_g: z.number().min(0).describe('Carbohydrates content in grams'),
  fats_g: z.number().min(0).describe('Fats content in grams'),
  estimated_cost_inr: z.number().min(0).describe('Realistic estimated ingredient cost in ₹ INR'),
});

const nutritionSummarySchema = z.object({
  calories: z.number().min(0).describe('Total calories in kcal'),
  protein_g: z.number().min(0).describe('Total protein in grams'),
  carbs_g: z.number().min(0).describe('Total carbohydrates in grams'),
  fats_g: z.number().min(0).describe('Total fats in grams'),
  fiber_g: z.number().min(0).nullish().describe('Optional dietary fiber in grams'),
  iron_mg: z.number().min(0).nullish().describe('Optional iron in milligrams'),
});

/**
 * Tool: proposeRecipe
 * Synthesizes a structured culinary recipe tailored to flat-cookware constraints.
 */
export const proposeRecipe = tool({
  description:
    'Proposes a structured, complete Indian culinary recipe tailored to the user cookware, pantry, and macro goals.',
  inputSchema: z.object({
    name: z.string().trim().min(1).describe('Culinary recipe title (e.g. "Street-Style Egg Bhurji", "20-Min Toor Dal Tadka")'),
    description: z.string().trim().describe('Warm 1-2 sentence description highlighting flavors, textures, and ease of preparation'),
    meal_category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Target meal slot'),
    prep_time_minutes: z.number().int().min(1).describe('Active prep time in minutes'),
    cook_time_minutes: z.number().int().min(1).describe('Active cook time in minutes'),
    servings: z.number().min(1).default(1).describe('Number of portions yielded'),
    cookware_needed: z.array(z.string().trim()).describe('Cookware items strictly chosen from user available equipment'),
    ingredients: z.array(proposedIngredientSchema).min(1).describe('List of recipe ingredients with canonical units and macros'),
    instructions: z.array(z.string().trim().min(1)).min(1).describe('Numbered step-by-step cooking directions'),
    total_nutrition: nutritionSummarySchema.describe('Aggregated nutritional totals for the entire recipe'),
    total_cost_inr: z.number().min(0).describe('Total recipe cost in ₹ INR'),
    cost_per_serving_inr: z.number().min(0).describe('Cost per serving in ₹ INR'),
  }),
  execute: async (input): Promise<ProposedRecipePayload> => {
    const proposalId = `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      type: 'proposed_recipe',
      proposalId,
      ...input,
    };
  },
});

/**
 * Tool: scaleExistingRecipe
 * Scales an existing recipe anchored by an ingredient quantity.
 */
export const scaleExistingRecipe = tool({
  description:
    'Dynamically scales an existing recipe anchored by an ingredient quantity (e.g., "I have 5 eggs, scale this recipe") or serving count.',
  inputSchema: z.object({
    recipe_id: z.string().nullish().describe('UUID of the recipe if already in the library'),
    recipe_title: z.string().trim().min(1).describe('Title of the recipe being scaled'),
    anchor_ingredient: z.object({
      name: z.string().trim().min(1).describe('Name of the anchor ingredient'),
      target_quantity: z.number().positive().describe('Target amount requested by the user'),
      target_unit: z.string().trim().describe('Unit of target quantity (e.g. pcs, g, ml)'),
    }),
    scale_factor: z.number().positive().describe('Calculated scaling factor multiplier (e.g. 1.67)'),
    scaled_ingredients: z.array(proposedIngredientSchema).min(1).describe('Scaled ingredient list with recalculated quantities and macros'),
    updated_servings: z.number().positive().describe('Recalculated serving portions'),
    updated_instructions: z.array(z.string().trim()).nullish().describe('Optional adjusted instructions if batch size alters cooking time or technique'),
    recalculated_nutrition: z.object({
      calories: z.number().min(0),
      protein_g: z.number().min(0),
      carbs_g: z.number().min(0),
      fats_g: z.number().min(0),
    }),
    recalculated_cost_inr: z.number().min(0).describe('Total recalculated cost in ₹ INR'),
  }),
  execute: async (input): Promise<ScaledRecipePayload> => {
    const proposalId = `scaled-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      type: 'scaled_recipe',
      proposalId,
      ...input,
    };
  },
});

/**
 * Tool: generateMacroMealPlan
 * Generates flat-friendly meal proposals calibrated to hit user daily macro splits.
 */
export const generateMacroMealPlan = tool({
  description:
    'Generates a macro-balanced meal plan lineup matching daily calorie and macro splits within flat cookware limits.',
  inputSchema: z.object({
    plan_date: z.string().trim().describe('Target date (YYYY-MM-DD) or plan label like "Today\'s High-Protein Plan"'),
    target_summary: z.object({
      calories: z.number().min(0),
      protein_g: z.number().min(0),
      carbs_g: z.number().min(0),
      fats_g: z.number().min(0),
    }),
    meals: z
      .array(
        z.object({
          meal_category: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
          recipe: z.object({
            name: z.string().trim().min(1),
            description: z.string().trim(),
            cookware_needed: z.array(z.string().trim()),
            ingredients: z.array(proposedIngredientSchema).min(1),
            instructions: z.array(z.string().trim().min(1)).min(1),
            nutrition: z.object({
              calories: z.number().min(0),
              protein_g: z.number().min(0),
              carbs_g: z.number().min(0),
              fats_g: z.number().min(0),
            }),
            estimated_cost_inr: z.number().min(0),
          }),
        })
      )
      .min(1)
      .describe('Array of meals covering target daily macros'),
  }),
  execute: async (input): Promise<MacroMealPlanPayload> => {
    const proposalId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const meals = input.meals.map((item, index) => ({
      ...item,
      mealProposalId: `${proposalId}-meal-${index + 1}`,
    }));
    return {
      type: 'macro_meal_plan',
      proposalId,
      plan_date: input.plan_date,
      target_summary: input.target_summary,
      meals,
    };
  },
});

export const tools = {
  proposeRecipe,
  scaleExistingRecipe,
  generateMacroMealPlan,
};
