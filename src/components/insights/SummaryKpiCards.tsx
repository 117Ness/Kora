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
      {/* Card 1: Month-to-Date Spend */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            MTD Spend
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(budget.spentSoFar)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-emerald-400 font-medium">Day {boundaries.daysElapsed}</span>
            <span>of {boundaries.daysInMonth} ({percentMonthElapsed}%)</span>
          </div>
        </div>
      </div>

      {/* Card 2: Projected End-of-Month Cost */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Projected Month-End
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(budget.projectedMonthlyCost)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-cyan-400 font-medium">
              {boundaries.remainingDaysInMonth} days
            </span>
            <span>remaining ({formatCurrency(budget.avgDailyBurn * boundaries.remainingDaysInMonth)})</span>
          </div>
        </div>
      </div>

      {/* Card 3: Daily Burn Rate */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Daily Burn Rate
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(budget.avgDailyBurn)}
            <span className="text-xs font-normal text-slate-400 ml-1">/ day</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            {budget.loggedDaysCount >= 3 ? (
              <span className="text-amber-400 font-medium">From {budget.loggedDaysCount} logged days</span>
            ) : budget.loggedDaysCount > 0 ? (
              <span className="text-amber-400/90 font-medium">Blended (logged + plan)</span>
            ) : (
              <span className="text-slate-400">Weekly schedule baseline</span>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Logged Days / Calories */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-lg shadow-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Logged Days &amp; Intake
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {budget.loggedDaysCount}
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {boundaries.daysElapsed} days
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            {avgDailyCalories > 0 ? (
              <>
                <Sparkles className="h-3 w-3 text-violet-400" />
                <span className="text-violet-300 font-medium">
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
