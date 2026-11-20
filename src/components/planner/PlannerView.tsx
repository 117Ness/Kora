'use client';

import { useState, useCallback } from 'react';
import type { DayPlanWithRecipe, RecipeWithIngredients } from '@/types/kora';
import { getPlannerData } from '@/app/actions/kora';
import { WeekdayAccordion } from './WeekdayAccordion';
import { ActiveDayRecipes } from './ActiveDayRecipes';
import { AvailableRecipes } from './AvailableRecipes';
import { CreateRecipeModal } from './CreateRecipeModal';
import { Calendar, Sparkles } from 'lucide-react';

interface PlannerViewProps {
  initialDayPlans: DayPlanWithRecipe[];
  initialRecipes: RecipeWithIngredients[];
}

export function PlannerView({
  initialDayPlans,
  initialRecipes,
}: PlannerViewProps) {
  const [dayPlans, setDayPlans] = useState<DayPlanWithRecipe[]>(initialDayPlans);
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>(initialRecipes);
  const [selectedDay, setSelectedDay] = useState<number>(() =>
    new Date().getDay()
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const refreshData = useCallback(async () => {
    const res = await getPlannerData();
    if (res.success) {
      setDayPlans(res.data.dayPlans);
      setRecipes(res.data.recipes);
    }
  }, []);

  return (
    <div className="space-y-8 pb-24">
      {/* Planner Top Hero / Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="h-3.5 w-3.5" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Meal &amp; Nutrition Planner
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Schedule recipes across the week, calibrate servings, compute daily
            grocery burn, and log ingredient consumption into your ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            <span>New Recipe</span>
          </button>
        </div>
      </div>

      {/* Weekday Horizontal Accordion */}
      <WeekdayAccordion
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        dayPlans={dayPlans}
      />

      {/* Section 1: Active Recipes for Selected Day */}
      <ActiveDayRecipes
        selectedDay={selectedDay}
        dayPlans={dayPlans}
        onDataChange={refreshData}
      />

      {/* Section 2: Available Recipes Library */}
      <AvailableRecipes
        selectedDay={selectedDay}
        recipes={recipes}
        onDataChange={refreshData}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Floating Action Button & Create Recipe Modal */}
      <CreateRecipeModal
        isOpen={isCreateModalOpen}
        onOpen={() => setIsCreateModalOpen(true)}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
}

export default PlannerView;
