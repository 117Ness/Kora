/**
 * Kora – Analytics & Insights Engine
 *
 * Pure computation module: takes raw DB rows and returns
 * fully-computed analytics structures for the /insights page.
 */

import type {
  ConsumptionLog,
  DayPlanWithRecipe,
  Ingredient,
  RecipeWithIngredients,
} from '@/types/kora';

// =============================================================
// 1. Date & Month Boundaries
// =============================================================

export interface MonthBoundaries {
  /** First day of the current month (YYYY-MM-DD) */
  monthStart: string;
  /** Today (YYYY-MM-DD) */
  today: string;
  /** Days elapsed this month (always >= 1) */
  daysElapsed: number;
  /** Calendar days remaining after today */
  remainingDaysInMonth: number;
  /** Total calendar days in the current month */
  daysInMonth: number;
  /** Current month label, e.g. "November 2026" */
  monthLabel: string;
}

/** Pad a number to 2 digits */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a local Date to YYYY-MM-DD without timezone shifts */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getMonthBoundaries(now: Date = new Date()): MonthBoundaries {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const dayOfMonth = now.getDate();

  const firstOfMonth = new Date(year, month, 1);
  // Last day: day 0 of *next* month gives last day of *this* month
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();

  const daysElapsed = Math.max(dayOfMonth, 1);
  const remainingDaysInMonth = daysInMonth - dayOfMonth;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return {
    monthStart: toDateStr(firstOfMonth),
    today: toDateStr(now),
    daysElapsed,
    remainingDaysInMonth,
    daysInMonth,
    monthLabel: `${monthNames[month]} ${year}`,
  };
}

// =============================================================
// 2. Daily & Cumulative Ingredient Consumption
// =============================================================

export interface DailyIngredientPoint {
  date: string;             // YYYY-MM-DD
  ingredientId: string;
  ingredientName: string;
  unit: string;
  quantityConsumed: number;
  cost: number;
}

export interface CumulativeIngredient {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalQuantity: number;    // month-to-date total quantity consumed
  totalCost: number;        // month-to-date total cost
}

export interface IngredientConsumption {
  /** Daily series grouped by date then ingredient */
  dailySeries: DailyIngredientPoint[];
  /** Month-to-date cumulative totals per ingredient */
  cumulativeTotals: CumulativeIngredient[];
}

export function computeIngredientConsumption(
  logs: ConsumptionLog[],
  ingredientMap: Map<string, Ingredient>,
  monthStart: string,
  today: string,
): IngredientConsumption {
  // Filter to current month
  const monthLogs = logs.filter(
    (l) => l.log_date >= monthStart && l.log_date <= today,
  );

  // ---- Daily series ----
  // key: `${date}|${ingredientId}`
  const dailyMap = new Map<string, DailyIngredientPoint>();
  // ---- Cumulative totals ----
  const cumulMap = new Map<string, CumulativeIngredient>();

  for (const log of monthLogs) {
    const ing = ingredientMap.get(log.ingredient_id);
    const ingName = ing?.name ?? 'Unknown';
    const unit = ing?.unit ?? '';

    // daily
    const dKey = `${log.log_date}|${log.ingredient_id}`;
    const existing = dailyMap.get(dKey);
    if (existing) {
      existing.quantityConsumed += Number(log.quantity_consumed);
      existing.cost += Number(log.computed_cost);
    } else {
      dailyMap.set(dKey, {
        date: log.log_date,
        ingredientId: log.ingredient_id,
        ingredientName: ingName,
        unit,
        quantityConsumed: Number(log.quantity_consumed),
        cost: Number(log.computed_cost),
      });
    }

    // cumulative
    const cum = cumulMap.get(log.ingredient_id);
    if (cum) {
      cum.totalQuantity += Number(log.quantity_consumed);
      cum.totalCost += Number(log.computed_cost);
    } else {
      cumulMap.set(log.ingredient_id, {
        ingredientId: log.ingredient_id,
        ingredientName: ingName,
        unit,
        totalQuantity: Number(log.quantity_consumed),
        totalCost: Number(log.computed_cost),
      });
    }
  }

  // Sort daily series by date then ingredient name
  const dailySeries = Array.from(dailyMap.values()).sort((a, b) =>
    a.date === b.date
      ? a.ingredientName.localeCompare(b.ingredientName)
      : a.date.localeCompare(b.date),
  );

  // Sort cumulative by total cost descending
  const cumulativeTotals = Array.from(cumulMap.values()).sort(
    (a, b) => b.totalCost - a.totalCost,
  );

  return { dailySeries, cumulativeTotals };
}

// =============================================================
// 3. Health Trend Series
// =============================================================

export interface HealthTrendPoint {
  date: string;             // YYYY-MM-DD
  totalCalories: number;    // derived: quantity_consumed * calories_per_unit
  avgHealthScore: number | null; // average health_score across logs that day
}

export function computeHealthTrends(
  logs: ConsumptionLog[],
  ingredientMap: Map<string, Ingredient>,
  monthStart: string,
  today: string,
): HealthTrendPoint[] {
  const monthLogs = logs.filter(
    (l) => l.log_date >= monthStart && l.log_date <= today,
  );

  // key: date
  const dayAcc = new Map<
    string,
    { calories: number; healthScores: number[]; count: number }
  >();

  for (const log of monthLogs) {
    const ing = ingredientMap.get(log.ingredient_id);
    const calPerUnit = Number(ing?.calories_per_unit ?? 0);
    const dailyCals = Number(log.quantity_consumed) * calPerUnit;

    const acc = dayAcc.get(log.log_date);
    if (acc) {
      acc.calories += dailyCals;
      if (log.health_score != null) {
        acc.healthScores.push(Number(log.health_score));
      }
      acc.count += 1;
    } else {
      dayAcc.set(log.log_date, {
        calories: dailyCals,
        healthScores:
          log.health_score != null ? [Number(log.health_score)] : [],
        count: 1,
      });
    }
  }

  return Array.from(dayAcc.entries())
    .map(([date, acc]) => ({
      date,
      totalCalories: parseFloat(acc.calories.toFixed(2)),
      avgHealthScore:
        acc.healthScores.length > 0
          ? parseFloat(
              (
                acc.healthScores.reduce((s, v) => s + v, 0) /
                acc.healthScores.length
              ).toFixed(1),
            )
          : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// =============================================================
// 4. Budget & Monthly Prediction Math
// =============================================================

export interface BudgetSummary {
  /** Total cost from consumption_logs this month */
  spentSoFar: number;
  /** Number of distinct logged days this month */
  loggedDaysCount: number;
  /** Blended average daily cost burn rate */
  avgDailyBurn: number;
  /** Projected total monthly cost */
  projectedMonthlyCost: number;
  /** Scheduled weekly average cost from day_plans (7-day) */
  scheduledWeeklyAvgCost: number;
}

export interface IngredientProjection {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  /** Quantity consumed month-to-date */
  usedSoFar: number;
  /** Average daily usage */
  avgDailyUsage: number;
  /** Projected total quantity for the full month */
  projectedMonthlyQuantity: number;
  /** Projected total cost for the full month */
  projectedMonthlyCost: number;
}

/**
 * Compute the scheduled weekly average cost from the planner's day_plans.
 * Sums the per-serving cost for all 7 days then divides by 7.
 */
function computeScheduledWeeklyAvgDailyCost(
  dayPlans: DayPlanWithRecipe[],
): number {
  let weeklyTotal = 0;

  for (const dp of dayPlans) {
    const recipe = dp.recipe as RecipeWithIngredients;
    const servings = Number(dp.servings) || 1;

    if (!recipe?.recipe_ingredients?.length) continue;

    let recipeCost = 0;
    for (const ri of recipe.recipe_ingredients) {
      const ing = ri.ingredient;
      if (!ing || !ing.pack_size || Number(ing.pack_size) <= 0) continue;
      const unitCost = Number(ing.pack_cost) / Number(ing.pack_size);
      recipeCost += Number(ri.quantity_used) * unitCost;
    }

    weeklyTotal += recipeCost * servings;
  }

  return weeklyTotal / 7;
}

export function computeBudgetSummary(
  logs: ConsumptionLog[],
  dayPlans: DayPlanWithRecipe[],
  boundaries: MonthBoundaries,
): BudgetSummary {
  const { monthStart, today, remainingDaysInMonth } = boundaries;

  // Filter to current month
  const monthLogs = logs.filter(
    (l) => l.log_date >= monthStart && l.log_date <= today,
  );

  // spentSoFar: sum of computed_cost
  const spentSoFar = monthLogs.reduce(
    (sum, l) => sum + Number(l.computed_cost),
    0,
  );

  // Distinct logged days
  const loggedDays = new Set(monthLogs.map((l) => l.log_date));
  const loggedDaysCount = loggedDays.size;

  // Scheduled weekly average daily cost from planner
  const scheduledWeeklyAvgCost = computeScheduledWeeklyAvgDailyCost(dayPlans);

  // avgDailyBurn: blend when fewer than 3 logged days
  let avgDailyBurn: number;
  if (loggedDaysCount >= 3) {
    // Enough history – use pure logged average
    avgDailyBurn = spentSoFar / loggedDaysCount;
  } else if (loggedDaysCount > 0) {
    // 1-2 logged days: 50/50 blend of logged average and scheduled average
    const loggedAvg = spentSoFar / loggedDaysCount;
    avgDailyBurn = (loggedAvg + scheduledWeeklyAvgCost) / 2;
  } else {
    // No logs at all: fall back entirely to scheduled plan
    avgDailyBurn = scheduledWeeklyAvgCost;
  }

  const projectedMonthlyCost = spentSoFar + avgDailyBurn * remainingDaysInMonth;

  return {
    spentSoFar: parseFloat(spentSoFar.toFixed(2)),
    loggedDaysCount,
    avgDailyBurn: parseFloat(avgDailyBurn.toFixed(4)),
    projectedMonthlyCost: parseFloat(projectedMonthlyCost.toFixed(2)),
    scheduledWeeklyAvgCost: parseFloat(scheduledWeeklyAvgCost.toFixed(2)),
  };
}

export function computeIngredientProjections(
  logs: ConsumptionLog[],
  ingredientMap: Map<string, Ingredient>,
  boundaries: MonthBoundaries,
): IngredientProjection[] {
  const { monthStart, today, remainingDaysInMonth } = boundaries;

  const monthLogs = logs.filter(
    (l) => l.log_date >= monthStart && l.log_date <= today,
  );

  // Distinct logged days this month (for per-ingredient daily average)
  const loggedDays = new Set(monthLogs.map((l) => l.log_date));
  const loggedDaysCount = Math.max(loggedDays.size, 1);

  // Accumulate per ingredient
  const accMap = new Map<
    string,
    { quantity: number; cost: number }
  >();

  for (const log of monthLogs) {
    const acc = accMap.get(log.ingredient_id);
    if (acc) {
      acc.quantity += Number(log.quantity_consumed);
      acc.cost += Number(log.computed_cost);
    } else {
      accMap.set(log.ingredient_id, {
        quantity: Number(log.quantity_consumed),
        cost: Number(log.computed_cost),
      });
    }
  }

  const projections: IngredientProjection[] = [];

  for (const [ingredientId, acc] of accMap) {
    const ing = ingredientMap.get(ingredientId);
    const ingName = ing?.name ?? 'Unknown';
    const unit = ing?.unit ?? '';

    const avgDailyUsage = acc.quantity / loggedDaysCount;
    const avgDailyCost = acc.cost / loggedDaysCount;

    projections.push({
      ingredientId,
      ingredientName: ingName,
      unit,
      usedSoFar: parseFloat(acc.quantity.toFixed(4)),
      avgDailyUsage: parseFloat(avgDailyUsage.toFixed(4)),
      projectedMonthlyQuantity: parseFloat(
        (acc.quantity + avgDailyUsage * remainingDaysInMonth).toFixed(4),
      ),
      projectedMonthlyCost: parseFloat(
        (acc.cost + avgDailyCost * remainingDaysInMonth).toFixed(2),
      ),
    });
  }

  // Sort by projected monthly cost descending
  projections.sort((a, b) => b.projectedMonthlyCost - a.projectedMonthlyCost);

  return projections;
}

// =============================================================
// Master analytics pipeline
// =============================================================

export interface InsightsAnalytics {
  boundaries: MonthBoundaries;
  ingredientConsumption: IngredientConsumption;
  healthTrends: HealthTrendPoint[];
  budget: BudgetSummary;
  ingredientProjections: IngredientProjection[];
}

export function computeInsightsAnalytics(
  logs: ConsumptionLog[],
  ingredients: Ingredient[],
  dayPlans: DayPlanWithRecipe[],
  now?: Date,
): InsightsAnalytics {
  const boundaries = getMonthBoundaries(now);

  // Build ingredient lookup map
  const ingredientMap = new Map<string, Ingredient>();
  for (const ing of ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  const ingredientConsumption = computeIngredientConsumption(
    logs, ingredientMap, boundaries.monthStart, boundaries.today,
  );
  const healthTrends = computeHealthTrends(
    logs, ingredientMap, boundaries.monthStart, boundaries.today,
  );
  const budget = computeBudgetSummary(logs, dayPlans, boundaries);
  const ingredientProjections = computeIngredientProjections(
    logs, ingredientMap, boundaries,
  );

  return {
    boundaries,
    ingredientConsumption,
    healthTrends,
    budget,
    ingredientProjections,
  };
}
