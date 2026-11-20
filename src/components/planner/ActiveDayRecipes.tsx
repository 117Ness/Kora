'use client';

import { useState, useTransition } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Flame,
  Activity,
  Layers,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DayPlanWithRecipe, RecipeWithIngredients } from '@/types/kora';
import {
  addRecipeToDay,
  removeRecipeFromDay,
  logDayConsumption,
} from '@/app/actions/kora';
import {
  DAYS_OF_WEEK,
  calculateRecipeCost,
  calculateRecipeCalories,
  formatCurrency,
  formatCalories,
} from './utils';

interface ActiveDayRecipesProps {
  selectedDay: number;
  dayPlans: DayPlanWithRecipe[];
  onDataChange: () => Promise<void>;
}

export function ActiveDayRecipes({
  selectedDay,
  dayPlans,
  onDataChange,
}: ActiveDayRecipesProps) {
  const [isPending, startTransition] = useTransition();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Health score & Log state
  const [healthScore, setHealthScore] = useState<string>('85');
  const [logDate, setLogDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [showLogOptions, setShowLogOptions] = useState<boolean>(false);
  const [expandedIngredients, setExpandedIngredients] = useState<
    Record<string, boolean>
  >({});

  const dayName = DAYS_OF_WEEK[selectedDay];
  const activePlans = dayPlans.filter((dp) => dp.day_of_week === selectedDay);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const handleAddServing = (recipeId: string, planId: string) => {
    setActionLoadingId(`add-${planId}`);
    startTransition(async () => {
      const res = await addRecipeToDay(selectedDay, recipeId, 1);
      if (res.success) {
        await onDataChange();
        showToast('success', 'Added +1 serving successfully');
      } else {
        showToast('error', res.error);
      }
      setActionLoadingId(null);
    });
  };

  const handleRemove = (planId: string, recipeName: string) => {
    setActionLoadingId(`remove-${planId}`);
    startTransition(async () => {
      const res = await removeRecipeFromDay(planId);
      if (res.success) {
        await onDataChange();
        showToast('success', `Removed "${recipeName}" from ${dayName}`);
      } else {
        showToast('error', res.error);
      }
      setActionLoadingId(null);
    });
  };

  const handleLogMeals = () => {
    if (activePlans.length === 0) {
      showToast('error', `No meals scheduled for ${dayName} to log.`);
      return;
    }

    const scoreNum = healthScore ? Number(healthScore) : undefined;
    if (
      scoreNum !== undefined &&
      (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100)
    ) {
      showToast('error', 'Health score must be a number between 0 and 100');
      return;
    }

    setActionLoadingId('logging');
    startTransition(async () => {
      const res = await logDayConsumption(selectedDay, logDate, scoreNum);
      if (res.success) {
        await onDataChange();
        showToast(
          'success',
          `Logged ${res.data.logsInserted} ingredient consumption records for ${dayName}!`
        );
      } else {
        showToast('error', res.error);
      }
      setActionLoadingId(null);
    });
  };

  const toggleIngredients = (planId: string) => {
    setExpandedIngredients((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  return (
    <section className="space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs text-slate-400 hover:text-slate-200 ml-4 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-100">
            Scheduled for {dayName}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {activePlans.length} {activePlans.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Log Action trigger */}
        {activePlans.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogOptions(!showLogOptions)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/80 transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>Log Options</span>
              {showLogOptions ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            <button
              type="button"
              disabled={isPending || actionLoadingId === 'logging'}
              onClick={handleLogMeals}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>
                {actionLoadingId === 'logging'
                  ? 'Logging meals...'
                  : "Log Day's Meals"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Log Options Drawer */}
      {showLogOptions && activePlans.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Consumption Log Parameters
            </span>
            <span className="text-[11px] text-slate-400">
              Recorded into daily consumption ledger
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="log-date"
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Log Date (YYYY-MM-DD)
              </label>
              <input
                id="log-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="health-score"
                className="block text-xs font-medium text-slate-400 mb-1"
              >
                Health Score (0–100, optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="health-score"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="85"
                  value={healthScore}
                  onChange={(e) => setHealthScore(e.target.value)}
                  className="w-24 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={healthScore || '0'}
                  onChange={(e) => setHealthScore(e.target.value)}
                  className="flex-1 accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-400 w-8 text-right">
                  {healthScore || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipes List or Empty State */}
      {activePlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400 mb-3">
            <Utensils className="h-6 w-6 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            No recipes planned for {dayName}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Pick from your recipe library below or tap the emerald + button in
            the corner to create a fresh recipe.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activePlans.map((plan) => {
            const recipe = plan.recipe as RecipeWithIngredients;
            const servings = Number(plan.servings) || 1;
            const baseCost = calculateRecipeCost(recipe);
            const baseCalories = calculateRecipeCalories(recipe);
            const totalMealCost = baseCost * servings;
            const totalMealCalories = baseCalories * servings;
            const isRemoving = actionLoadingId === `remove-${plan.id}`;
            const isAddingServing = actionLoadingId === `add-${plan.id}`;
            const isExpanded = !!expandedIngredients[plan.id];
            const ingredientCount = recipe?.recipe_ingredients?.length || 0;

            return (
              <div
                key={plan.id}
                className="group rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Recipe Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white tracking-tight">
                        {recipe?.name || 'Unnamed Recipe'}
                      </h4>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                        <Layers className="h-3 w-3" />
                        {servings} {servings === 1 ? 'serving' : 'servings'}
                      </span>
                    </div>

                    {recipe?.notes && (
                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        &quot;{recipe.notes}&quot;
                      </p>
                    )}

                    {/* Stats strip */}
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1 text-slate-300">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="font-semibold text-emerald-300">
                          {formatCurrency(totalMealCost)}
                        </span>
                        {servings > 1 && (
                          <span className="text-[11px] text-slate-400">
                            ({formatCurrency(baseCost)}/ea)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-slate-300">
                        <Flame className="h-3.5 w-3.5 text-amber-400" />
                        <span className="font-semibold text-amber-300">
                          {formatCalories(totalMealCalories)}
                        </span>
                      </div>

                      {ingredientCount > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleIngredients(plan.id)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-slate-700 underline-offset-2 flex items-center gap-1"
                        >
                          <span>{ingredientCount} ingredients</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isPending || isAddingServing}
                      onClick={() => handleAddServing(recipe.id, plan.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
                      title="Add another serving"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isAddingServing ? 'Adding...' : '+1 Serving'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending || isRemoving}
                      onClick={() => handleRemove(plan.id, recipe.name)}
                      className="inline-flex items-center justify-center p-2 rounded-lg text-xs text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 border border-transparent hover:border-rose-900/60 transition-colors disabled:opacity-50"
                      title="Remove recipe from this day"
                    >
                      {isRemoving ? (
                        <Clock className="h-4 w-4 animate-spin text-rose-400" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="sr-only">Remove</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Ingredients List */}
                {isExpanded && recipe?.recipe_ingredients?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
                      Ingredients (Scaled for {servings} serving
                      {servings === 1 ? '' : 's'})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {recipe.recipe_ingredients.map((ri) => {
                        const ing = ri.ingredient;
                        const qty = Number(ri.quantity_used) * servings;
                        const ingCost =
                          ing?.pack_size && Number(ing.pack_size) > 0
                            ? (qty * Number(ing.pack_cost)) /
                              Number(ing.pack_size)
                            : 0;

                        return (
                          <div
                            key={ri.id || ri.ingredient_id}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60 text-xs"
                          >
                            <span className="font-medium text-slate-200 block truncate">
                              {ing?.name || 'Item'}
                            </span>
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-0.5">
                              <span>
                                {qty} {ing?.unit || ''}
                              </span>
                              <span className="text-emerald-400/90 font-medium">
                                {formatCurrency(ingCost)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ActiveDayRecipes;
