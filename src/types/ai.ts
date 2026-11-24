/**
 * Kora – AI Chef Architecture Domain Types
 * Defines structured contracts for AI recipe synthesis, dynamic scaling,
 * macro meal plan generation, and UI acceptance workflows.
 */

export type CanonicalUnit = 'g' | 'ml' | 'pcs';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface ProposedRecipeIngredient {
  name: string;
  quantity: number;
  unit: CanonicalUnit;
  weight_per_unit_g?: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  estimated_cost_inr: number;
}

export interface ProposedRecipeNutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g?: number | null;
  iron_mg?: number | null;
}

export interface ProposedRecipePayload {
  type: 'proposed_recipe';
  proposalId: string;
  name: string;
  description: string;
  meal_category: MealCategory;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  cookware_needed: string[];
  ingredients: ProposedRecipeIngredient[];
  instructions: string[];
  total_nutrition: ProposedRecipeNutrition;
  total_cost_inr: number;
  cost_per_serving_inr: number;
}

export interface ScaledRecipePayload {
  type: 'scaled_recipe';
  proposalId: string;
  recipe_id?: string | null;
  recipe_title: string;
  anchor_ingredient: {
    name: string;
    target_quantity: number;
    target_unit: string;
  };
  scale_factor: number;
  scaled_ingredients: ProposedRecipeIngredient[];
  updated_servings: number;
  updated_instructions?: string[] | null;
  recalculated_nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  recalculated_cost_inr: number;
}

export interface MacroMealPlanRecipe {
  name: string;
  description: string;
  cookware_needed: string[];
  ingredients: ProposedRecipeIngredient[];
  instructions: string[];
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  estimated_cost_inr: number;
}

export interface MacroMealPlanItem {
  mealProposalId: string;
  meal_category: MealCategory;
  recipe: MacroMealPlanRecipe;
}

export interface MacroMealPlanPayload {
  type: 'macro_meal_plan';
  proposalId: string;
  plan_date: string;
  target_summary: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
  };
  meals: MacroMealPlanItem[];
}

export interface AcceptProposedRecipeOptions {
  addToDate?: string; // YYYY-MM-DD format
  replaceRecipeId?: string; // UUID of recipe to overwrite
}

export interface AcceptProposedRecipeResult {
  recipeId: string;
  recipeName: string;
  dayPlanId?: string;
}
