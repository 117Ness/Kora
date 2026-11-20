'use client';

import { Calendar, DollarSign, Flame, Utensils } from 'lucide-react';
import type { DayPlanWithRecipe } from '@/types/kora';
import {
  DAYS_OF_WEEK,
  SHORT_DAYS,
  calculateDayTotals,
  formatCalories,
  formatCurrency,
} from './utils';

interface WeekdayAccordionProps {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  dayPlans: DayPlanWithRecipe[];
}

export function WeekdayAccordion({
  selectedDay,
  onSelectDay,
  dayPlans,
}: WeekdayAccordionProps) {
  const todayIndex = new Date().getDay();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Weekly Schedule
          </h2>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline-block">
          Select a day to view or edit planned meals
        </span>
      </div>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {DAYS_OF_WEEK.map((dayName, dayIndex) => {
          const isSelected = selectedDay === dayIndex;
          const isToday = todayIndex === dayIndex;
          const totals = calculateDayTotals(dayPlans, dayIndex);
          const shortName = SHORT_DAYS[dayIndex];

          return (
            <button
              key={dayName}
              type="button"
              onClick={() => onSelectDay(dayIndex)}
              aria-pressed={isSelected}
              className={`relative flex flex-col justify-between text-left rounded-2xl p-3 sm:p-4 transition-all duration-300 ease-in-out cursor-pointer select-none outline-none ${
                isSelected
                  ? 'flex-[2.8] min-w-[200px] sm:min-w-[240px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/70 shadow-xl shadow-emerald-950/30'
                  : 'flex-1 min-w-[65px] sm:min-w-[85px] bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700/80'
              }`}
            >
              {/* Top Row: Day Name & Badges */}
              <div className="flex items-start justify-between w-full gap-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-semibold tracking-tight ${
                        isSelected
                          ? 'text-base sm:text-lg text-white'
                          : 'text-sm sm:text-base text-slate-300'
                      }`}
                    >
                      {isSelected ? dayName : shortName}
                    </span>
                    {isToday && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30">
                        Today
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {totals.recipeCount === 0
                        ? 'No meals scheduled'
                        : `${totals.recipeCount} recipe${
                            totals.recipeCount === 1 ? '' : 's'
                          } (${totals.totalServings} serving${
                            totals.totalServings === 1 ? '' : 's'
                          })`}
                    </p>
                  )}
                </div>

                {/* Collapsed Indicator / Count badge */}
                {!isSelected && (
                  <div className="flex flex-col items-end">
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                        totals.recipeCount > 0
                          ? 'bg-slate-800 text-emerald-300 border border-emerald-500/20'
                          : 'text-slate-400 bg-slate-800/40'
                      }`}
                    >
                      {totals.recipeCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Middle/Bottom Content */}
              {isSelected ? (
                <div className="mt-4 pt-3 border-t border-slate-800/90 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                    <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">
                        Est. Cost
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        {formatCurrency(totals.cost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                    <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                      <Flame className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">
                        Calories
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        {formatCalories(totals.calories)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col items-center justify-center">
                  {totals.recipeCount > 0 ? (
                    <div className="text-[11px] font-medium text-slate-400 text-center">
                      <span className="text-emerald-400 font-semibold block">
                        {formatCurrency(totals.cost)}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {Math.round(totals.calories)} kcal
                      </span>
                    </div>
                  ) : (
                    <div className="h-6 flex items-center justify-center">
                      <Utensils className="h-3 w-3 text-slate-400" />
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default WeekdayAccordion;
