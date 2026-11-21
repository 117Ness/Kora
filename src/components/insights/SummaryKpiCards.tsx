'use client';

import {
  DollarSign,
  TrendingUp,
  Flame,
  CalendarCheck2,
  Sparkles,
} from 'lucide-react';
import type { InsightsAnalytics } from '@/lib/analytics';
import { formatCurrency, formatCalories } from './utils';

interface SummaryKpiCardsProps {
  data: InsightsAnalytics;
}

export function SummaryKpiCards({ data }: SummaryKpiCardsProps) {
  const { budget, boundaries, healthTrends } = data;

  // Calorie calculations
  const totalCaloriesLogged = healthTrends.reduce(
    (sum, pt) => sum + (pt.totalCalories || 0),
    0
  );
  const avgDailyCalories =
    budget.loggedDaysCount > 0
      ? totalCaloriesLogged / budget.loggedDaysCount
      : 0;

  const percentMonthElapsed = Math.round(
    (boundaries.daysElapsed / Math.max(boundaries.daysInMonth, 1)) * 100
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Month-to-Date Spend (Olive #7A7463) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 shadow-xs hover:border-[#7A7463]/70 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
            MTD Spend
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
            <DollarSign className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-3">
          <div className="kpi-figure font-serif text-2xl sm:text-3xl font-bold text-[#3E3C32] tracking-tight">
            {formatCurrency(budget.spentSoFar)}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#7D7765] font-sans">
            <span className="inline-flex items-center gap-1 font-semibold text-[#7A7463]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7A7463]" />
              Day {boundaries.daysElapsed}
            </span>
            <span>of {boundaries.daysInMonth} ({percentMonthElapsed}%)</span>
          </div>
        </div>
      </div>

      {/* Card 2: Projected End-of-Month Cost (Sage #6B7F5E) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 shadow-xs hover:border-[#6B7F5E]/70 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
            Projected Month-End
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#6B7F5E] border border-[#C8BFA8] shadow-xs">
            <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
          </div>
        </div>
        <div className="mt-3">
          <div className="kpi-figure font-serif text-2xl sm:text-3xl font-bold text-[#3E3C32] tracking-tight">
            {formatCurrency(budget.projectedMonthlyCost)}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#7D7765] font-sans">
            <span className="font-semibold text-[#6B7F5E]">
              {boundaries.remainingDaysInMonth} days
            </span>
            <span>remaining ({formatCurrency(budget.avgDailyBurn * boundaries.remainingDaysInMonth)})</span>
          </div>
        </div>
      </div>

      {/* Card 3: Daily Burn Rate (Terracotta #B86B4B) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 shadow-xs hover:border-[#B86B4B]/70 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
            Daily Burn Rate
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#B86B4B] border border-[#C8BFA8] shadow-xs">
            <Flame className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-3">
          <div className="kpi-figure font-serif text-2xl sm:text-3xl font-bold text-[#3E3C32] tracking-tight">
            {formatCurrency(budget.avgDailyBurn)}
            <span className="font-sans text-xs font-normal text-[#7D7765] ml-1">/ day</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#7D7765] font-sans">
            {budget.loggedDaysCount >= 3 ? (
              <span className="text-[#B86B4B] font-medium">From {budget.loggedDaysCount} logged days</span>
            ) : budget.loggedDaysCount > 0 ? (
              <span className="text-[#B86B4B] font-medium">Blended (logged + plan)</span>
            ) : (
              <span className="text-[#7D7765]">Weekly schedule baseline</span>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Logged Days / Calories (Ochre #C49A45) */}
      <div className="relative overflow-hidden rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 shadow-xs hover:border-[#C49A45]/70 hover:shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
            Logged Days &amp; Intake
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#C49A45] border border-[#C8BFA8] shadow-xs">
            <CalendarCheck2 className="h-4 w-4" strokeWidth={1.5} />
          </div>
        </div>
        <div className="mt-3">
          <div className="kpi-figure font-serif text-2xl sm:text-3xl font-bold text-[#3E3C32] tracking-tight">
            {budget.loggedDaysCount}
            <span className="font-sans text-sm font-normal text-[#7D7765] ml-1">
              / {boundaries.daysElapsed} days
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#7D7765] font-sans">
            {avgDailyCalories > 0 ? (
              <>
                <Sparkles className="h-3 w-3 text-[#C49A45]" strokeWidth={1.5} />
                <span className="text-[#C49A45] font-semibold font-serif">
                  {formatCalories(avgDailyCalories)}
                </span>
                <span>daily avg</span>
              </>
            ) : (
              <span>No meal logs recorded yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryKpiCards;
