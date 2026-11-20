import type { DayPlanWithRecipe, RecipeWithIngredients } from '@/types/kora';

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function calculateRecipeCost(recipe: RecipeWithIngredients | undefined | null): number {
  if (!recipe || !recipe.recipe_ingredients?.length) return 0;
  return recipe.recipe_ingredients.reduce((total, ri) => {
    const ing = ri.ingredient;
    if (!ing || !ing.pack_size || Number(ing.pack_size) <= 0) return total;
    const unitCost = Number(ing.pack_cost) / Number(ing.pack_size);
    return total + Number(ri.quantity_used) * unitCost;
  }, 0);
}

export function calculateRecipeCalories(recipe: RecipeWithIngredients | undefined | null): number {
  if (!recipe || !recipe.recipe_ingredients?.length) return 0;
  return recipe.recipe_ingredients.reduce((total, ri) => {
    const ing = ri.ingredient;
    if (!ing) return total;
    return total + Number(ri.quantity_used) * Number(ing.calories_per_unit ?? 0);
  }, 0);
}

export function calculateDayTotals(dayPlans: DayPlanWithRecipe[], dayOfWeek: number) {
  const plansForDay = dayPlans.filter((dp) => dp.day_of_week === dayOfWeek);

  return plansForDay.reduce(
    (acc, dp) => {
      const recipe = dp.recipe as RecipeWithIngredients;
      const servings = Number(dp.servings) || 1;
      const recipeCost = calculateRecipeCost(recipe);
      const recipeCalories = calculateRecipeCalories(recipe);

      return {
        cost: acc.cost + recipeCost * servings,
        calories: acc.calories + recipeCalories * servings,
        recipeCount: acc.recipeCount + 1,
        totalServings: acc.totalServings + servings,
      };
    },
    { cost: 0, calories: 0, recipeCount: 0, totalServings: 0 }
  );
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCalories(kcal: number): string {
  return `${Math.round(kcal).toLocaleString()} kcal`;
}
