/**
 * Kora – Core Domain & Database Types
 * Matches supabase/schema.sql v3 (Multi-User, AI Chef Assistant, Macros)
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

export interface UserProfile {
  id: string;                          // auth.users(id)
  display_name: string | null;
  daily_calorie_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fats_target_g: number;
  micro_goals: string[];
  cookware: string[];
  dietary_preferences: string | null;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  user_id?: string | null;
  name: string;
  unit: string; // canonical: 'g' | 'ml' | 'pcs'
  pack_size: number;
  pack_cost: number;
  calories_per_unit: number;
  protein_per_unit: number;
  carbs_per_unit: number;
  fats_per_unit: number;
  weight_per_unit_g: number | null;  // g per piece for pcs items; null for g/ml items
  stock_quantity: number;             // current pantry stock in canonical unit
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id?: string | null;
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
  user_id?: string | null;
  day_of_week: DayOfWeek;
  recipe_id: string;
  servings: number;
  sort_order: number;
}

export interface ConsumptionLog {
  id: string;
  user_id?: string | null;
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
  total_protein?: number;
  total_carbs?: number;
  total_fats?: number;
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

export interface UpdateUserProfileInput {
  display_name?: string | null;
  daily_calorie_target?: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fats_target_g?: number;
  micro_goals?: string[];
  cookware?: string[];
  dietary_preferences?: string | null;
}

export interface CreateIngredientInput {
  user_id?: string | null;
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
}

export type UpdateIngredientInput = Partial<CreateIngredientInput>;

export interface RecipeIngredientInput {
  ingredient_id: string;
  quantity_used: number;
}

export interface CreateRecipeInput {
  user_id?: string | null;
  name: string;
  notes?: string | null;
  ingredients?: RecipeIngredientInput[];
}

export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export interface CreateDayPlanInput {
  user_id?: string | null;
  day_of_week: DayOfWeek;
  recipe_id: string;
  servings?: number;
  sort_order?: number;
}

export type UpdateDayPlanInput = Partial<CreateDayPlanInput>;

export interface CreateConsumptionLogInput {
  user_id?: string | null;
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
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<UserProfile, 'id'>>;
      };
      ingredients: {
        Row: Ingredient;
        Insert: Omit<Ingredient, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          protein_per_unit?: number;
          carbs_per_unit?: number;
          fats_per_unit?: number;
          weight_per_unit_g?: number | null;
          stock_quantity?: number;
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
          user_id?: string | null;
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
          user_id?: string | null;
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
          user_id?: string | null;
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
