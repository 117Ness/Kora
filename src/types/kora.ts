/**
 * Kora – Core Domain & Database Types
 * Matches supabase/schema.sql
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type DayOfWeekName = (typeof DAYS_OF_WEEK)[number];

// =============================================================
// Core Database Entities
// =============================================================

export interface Ingredient {
  id: string;
  name: string;
  unit: string; // e.g. 'g', 'ml', 'pcs'
  pack_size: number;
  pack_cost: number;
  calories_per_unit: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity_used: number;
}

export interface DayPlan {
  id: string;
  day_of_week: DayOfWeek;
  recipe_id: string;
  servings: number;
  sort_order: number;
}

export interface ConsumptionLog {
  id: string;
  log_date: string; // YYYY-MM-DD
  ingredient_id: string;
  quantity_consumed: number;
  computed_cost: number;
  health_score: number | null; // 0-100
}

// =============================================================
// Composite & Joined View Models
// =============================================================

export interface RecipeIngredientWithIngredient extends RecipeIngredient {
  ingredient: Ingredient;
}

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: RecipeIngredientWithIngredient[];
  // Calculated / derived properties for convenience
  total_cost?: number;
  total_calories?: number;
}

export interface DayPlanWithRecipe extends DayPlan {
  recipe: RecipeWithIngredients | Recipe;
}

export interface ConsumptionLogWithIngredient extends ConsumptionLog {
  ingredient: Ingredient;
}

// =============================================================
// DTO & Mutation Input Types
// =============================================================

export interface CreateIngredientInput {
  name: string;
  unit: string;
  pack_size: number;
  pack_cost: number;
  calories_per_unit?: number;
}

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

export interface RecipeIngredientInput {
  ingredient_id: string;
  quantity_used: number;
}

export interface CreateRecipeInput {
  name: string;
  notes?: string | null;
  ingredients?: RecipeIngredientInput[];
}

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export interface CreateDayPlanInput {
  day_of_week: DayOfWeek;
  recipe_id: string;
  servings?: number;
  sort_order?: number;
}

export type UpdateDayPlanInput = Partial<CreateDayPlanInput>;

export interface CreateConsumptionLogInput {
  log_date?: string;
  ingredient_id: string;
  quantity_consumed: number;
  computed_cost?: number;
  health_score?: number | null;
}

export type UpdateConsumptionLogInput = Partial<CreateConsumptionLogInput>;

// =============================================================
// Supabase Database Type Definitions
// =============================================================

export interface Database {
  public: {
    Tables: {
      ingredients: {
        Row: Ingredient;
        Insert: Omit<Ingredient, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Ingredient, 'id' | 'created_at'>> & {
          id?: string;
          created_at?: string;
        };
      };
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Recipe, 'id' | 'created_at'>> & {
          id?: string;
          created_at?: string;
        };
      };
      recipe_ingredients: {
        Row: RecipeIngredient;
        Insert: Omit<RecipeIngredient, 'id'> & {
          id?: string;
        };
        Update: Partial<Omit<RecipeIngredient, 'id'>> & {
          id?: string;
        };
      };
      day_plans: {
        Row: DayPlan;
        Insert: Omit<DayPlan, 'id' | 'servings' | 'sort_order'> & {
          id?: string;
          servings?: number;
          sort_order?: number;
        };
        Update: Partial<Omit<DayPlan, 'id'>> & {
          id?: string;
        };
      };
      consumption_logs: {
        Row: ConsumptionLog;
        Insert: Omit<ConsumptionLog, 'id' | 'log_date' | 'computed_cost' | 'health_score'> & {
          id?: string;
          log_date?: string;
          computed_cost?: number;
          health_score?: number | null;
        };
        Update: Partial<Omit<ConsumptionLog, 'id'>> & {
          id?: string;
        };
      };
    };
  };
}
