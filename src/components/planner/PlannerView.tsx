'use client';

import { useState, useCallback } from 'react';
import type { DayPlanWithRecipe, RecipeWithIngredients } from '@/types/kora';
import { getPlannerData } from '@/app/actions/kora';
import { WeekdayAccordion } from './WeekdayAccordion';
import { ActiveDayRecipes } from './ActiveDayRecipes';
import { AvailableRecipes } from './AvailableRecipes';
import { CreateRecipeModal } from './CreateRecipeModal';
import { Calendar, Plus } from 'lucide-react';
import { OliveSprigSvg } from '@/components/BotanicalAccents';

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
    <div className="space-y-8 pb-28">
      {/* Planner Top Hero / Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C8BFA8] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <Calendar className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#3E3C32] sm:text-3xl">
              Meal &amp; Nutrition Planner
            </h1>
            <OliveSprigSvg className="h-5 w-5 text-[#7A7463] hidden sm:block opacity-75" />
          </div>
          <p className="text-xs sm:text-sm text-[#7D7765] mt-1.5 max-w-xl font-sans">
            Schedule recipes across the week, calibrate servings, compute daily
            grocery burn, and log ingredient consumption into your ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-sm border border-[#7A7463] transition-all"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
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

      {/* Floating Action Button (bottom-6 right-6) & Create Recipe Modal */}
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
