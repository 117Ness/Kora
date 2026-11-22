'use client';

import { useState, useTransition } from 'react';
import {
  Utensils,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  IndianRupee,
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
import { OliveSprigSvg } from '@/components/BotanicalAccents';

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
          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 ${
            toast.type === 'success'
              ? 'bg-[#EBE3D2] border-[#7A7463] text-[#3E3C32]'
              : 'bg-[#B86B4B]/10 border-[#B86B4B]/40 text-[#B86B4B]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-[#7A7463] shrink-0" strokeWidth={1.5} />
            ) : (
              <AlertCircle className="h-5 w-5 text-[#B86B4B] shrink-0" strokeWidth={1.5} />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs text-[#7D7765] hover:text-[#3E3C32] ml-4 px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-[#7A7463]" strokeWidth={1.5} />
          <h2 className="font-serif text-lg font-bold text-[#3E3C32]">
            Scheduled for {dayName}
          </h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBE3D2] text-[#7D7765] border border-[#C8BFA8]">
            {activePlans.length} {activePlans.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Log Action trigger */}
        {activePlans.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLogOptions(!showLogOptions)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3E3C32] bg-[#EBE3D2] hover:bg-[#E4DCCB] rounded-full border border-[#C8BFA8] transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.5} />
              <span>Log Options</span>
              {showLogOptions ? (
                <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
              )}
            </button>

            <button
              type="button"
              disabled={isPending || actionLoadingId === 'logging'}
              onClick={handleLogMeals}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] transition-colors shadow-xs border border-[#7A7463] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
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
        <div className="p-4 rounded-2xl bg-[#EBE3D2]/70 border border-[#C8BFA8] space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#3E3C32] uppercase tracking-wider font-sans">
              Consumption Log Parameters
            </span>
            <span className="text-[11px] text-[#7D7765]">
              Recorded into daily consumption ledger
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="log-date"
                className="block text-xs font-medium text-[#7D7765] mb-1"
              >
                Log Date (YYYY-MM-DD)
              </label>
              <input
                id="log-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-1.5 text-xs text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
              />
            </div>

            <div>
              <label
                htmlFor="health-score"
                className="block text-xs font-medium text-[#7D7765] mb-1"
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
                  className="w-24 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-3 py-1.5 text-xs text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={healthScore || '0'}
                  onChange={(e) => setHealthScore(e.target.value)}
                  className="flex-1 accent-[#7A7463] h-1.5 bg-[#C8BFA8] rounded-lg cursor-pointer"
                />
                <span className="text-xs font-bold text-[#7A7463] w-8 text-right font-mono">
                  {healthScore || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipes List or Empty State */}
      {activePlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] text-[#7A7463] mb-3">
            <Utensils className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h3 className="font-serif text-base font-bold text-[#3E3C32]">
            No recipes planned for {dayName}
          </h3>
          <p className="text-xs text-[#7D7765] max-w-sm mx-auto mt-1 font-sans">
            Pick from your recipe library below or tap the olive + button in
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
                className="group relative rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-4 sm:p-5 transition-all hover:border-[#7A7463]/70 shadow-xs"
              >
                {/* Botanical accent emblem in background corner */}
                <div className="absolute right-4 top-4 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                  <OliveSprigSvg className="h-10 w-10 text-[#7A7463]" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  {/* Recipe Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="recipe-title font-serif text-base font-bold text-[#3E3C32] tracking-tight">
                        {recipe?.name || 'Unnamed Recipe'}
                      </h4>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-0.5 text-xs font-semibold text-[#7A7463]">
                        <Layers className="h-3 w-3" strokeWidth={1.5} />
                        {servings} {servings === 1 ? 'serving' : 'servings'}
                      </span>
                    </div>

                    {recipe?.notes && (
                      <p className="text-xs text-[#7D7765] line-clamp-1 italic font-sans">
                        &quot;{recipe.notes}&quot;
                      </p>
                    )}

                    {/* Stats strip */}
                    <div className="flex items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1 text-[#3E3C32]">
                        <IndianRupee className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={2} />
                        <span className="font-serif font-bold text-[#3E3C32]">
                          {formatCurrency(totalMealCost)}
                        </span>
                        {servings > 1 && (
                          <span className="text-[11px] text-[#7D7765] font-sans">
                            ({formatCurrency(baseCost)}/ea)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[#3E3C32]">
                        <Flame className="h-3.5 w-3.5 text-[#B86B4B]" strokeWidth={2} />
                        <span className="font-serif font-bold text-[#3E3C32]">
                          {formatCalories(totalMealCalories)}
                        </span>
                      </div>

                      {ingredientCount > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleIngredients(plan.id)}
                          className="text-[11px] text-[#7D7765] hover:text-[#3E3C32] underline decoration-[#C8BFA8] underline-offset-2 flex items-center gap-1 font-sans"
                        >
                          <span>{ingredientCount} ingredients</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
                          ) : (
                            <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F7F2E7] hover:bg-[#E4DCCB] text-[#3E3C32] border border-[#C8BFA8] transition-colors disabled:opacity-50 shadow-xs"
                      title="Add another serving"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{isAddingServing ? 'Adding...' : '+1 Serving'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending || isRemoving}
                      onClick={() => handleRemove(plan.id, recipe.name)}
                      className="inline-flex items-center justify-center p-2 rounded-full text-xs text-[#B86B4B] hover:text-[#B86B4B] hover:bg-[#B86B4B]/15 border border-[#C8BFA8]/60 transition-colors disabled:opacity-50"
                      title="Remove recipe from this day"
                    >
                      {isRemoving ? (
                        <Clock className="h-4 w-4 animate-spin text-[#B86B4B]" strokeWidth={1.5} />
                      ) : (
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      )}
                      <span className="sr-only">Remove</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Ingredients List */}
                {isExpanded && recipe?.recipe_ingredients?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#C8BFA8]/70">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] mb-2 block font-sans">
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
                            className="p-2.5 rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] text-xs shadow-xs"
                          >
                            <span className="font-serif font-medium text-[#3E3C32] block truncate">
                              {ing?.name || 'Item'}
                            </span>
                            <div className="flex items-center justify-between text-[11px] text-[#7D7765] mt-1 font-sans">
                              <span>
                                {qty} {ing?.unit || ''}
                              </span>
                              <span className="text-[#7A7463] font-semibold">
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
