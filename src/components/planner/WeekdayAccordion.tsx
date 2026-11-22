'use client';

import { Calendar, IndianRupee, Flame, Utensils } from 'lucide-react';
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
          <Calendar className="h-4 w-4 text-[#7A7463]" strokeWidth={1.5} />
          <h2 className="font-serif text-sm font-bold tracking-tight text-[#3E3C32]">
            Weekly Schedule
          </h2>
        </div>
        <span className="text-xs text-[#7D7765] hidden sm:inline-block font-sans">
          Select a day to view or edit planned meals
        </span>
      </div>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-[#C8BFA8] scrollbar-track-transparent">
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
                  ? 'flex-[2.8] min-w-[200px] sm:min-w-[240px] bg-[#EBE3D2] border-2 border-[#7A7463] shadow-md shadow-[#7A7463]/10'
                  : 'flex-1 min-w-[65px] sm:min-w-[85px] bg-[#F3EDE0] hover:bg-[#EBE3D2]/70 border border-[#C8BFA8]'
              }`}
            >
              {/* Top Row: Day Name & Badges */}
              <div className="flex items-start justify-between w-full gap-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-serif tracking-tight ${
                        isSelected
                          ? 'font-bold text-base sm:text-lg text-[#3E3C32]'
                          : 'font-semibold text-sm sm:text-base text-[#7D7765]'
                      }`}
                    >
                      {isSelected ? dayName : shortName}
                    </span>
                    {isToday && (
                      <span className="inline-flex items-center rounded-full bg-[#7A7463] px-2 py-0.5 text-[10px] font-medium text-[#F7F2E7] shadow-xs">
                        Today
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <p className="text-[11px] font-medium text-[#7D7765] mt-0.5 font-sans">
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
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        totals.recipeCount > 0
                          ? 'bg-[#EBE3D2] text-[#3E3C32] border-[#C8BFA8]'
                          : 'text-[#7D7765] bg-[#F3EDE0] border-[#C8BFA8]/60'
                      }`}
                    >
                      {totals.recipeCount}
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded State: Cost & Calorie Summary */}
              {isSelected && (
                <div className="mt-4 pt-3 border-t border-[#C8BFA8]/70 w-full space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-xl bg-[#F7F2E7] border border-[#C8BFA8]/80 px-2.5 py-1.5 shadow-xs">
                      <IndianRupee className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={2} />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#7D7765] uppercase tracking-wider font-semibold">
                          Burn
                        </span>
                        <span className="font-serif font-bold text-[#3E3C32]">
                          {formatCurrency(totals.cost)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-[#F7F2E7] border border-[#C8BFA8]/80 px-2.5 py-1.5 shadow-xs">
                      <Flame className="h-3.5 w-3.5 text-[#B86B4B]" strokeWidth={2} />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#7D7765] uppercase tracking-wider font-semibold">
                          Nutrition
                        </span>
                        <span className="font-serif font-bold text-[#3E3C32]">
                          {formatCalories(totals.calories)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {totals.recipeCount > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-[#7D7765] px-1 pt-1">
                      <span className="flex items-center gap-1">
                        <Utensils className="h-3 w-3 text-[#7A7463]" strokeWidth={1.5} />
                        <span>Active daily schedule</span>
                      </span>
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
