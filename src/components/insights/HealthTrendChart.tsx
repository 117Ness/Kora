'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { HeartPulse, Flame, Sparkles, Activity } from 'lucide-react';
import type { InsightsAnalytics } from '@/lib/analytics';
import { formatCalories, formatDateShort } from './utils';

interface HealthTrendChartProps {
  data: InsightsAnalytics;
}

export function HealthTrendChart({ data }: HealthTrendChartProps) {
  const { healthTrends } = data;

  const stats = useMemo(() => {
    if (healthTrends.length === 0) {
      return { avgCalories: 0, avgScore: null, validScoreDays: 0 };
    }
    const totalCals = healthTrends.reduce((s, d) => s + (d.totalCalories || 0), 0);
    const scoreItems = healthTrends.filter((d) => d.avgHealthScore != null);
    const totalScore = scoreItems.reduce((s, d) => s + (d.avgHealthScore || 0), 0);

    return {
      avgCalories: totalCals / healthTrends.length,
      avgScore: scoreItems.length > 0 ? totalScore / scoreItems.length : null,
      validScoreDays: scoreItems.length,
    };
  }, [healthTrends]);

  const hasData = healthTrends.length > 0;

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 p-5 sm:p-6 shadow-xl shadow-slate-950/40">
      {/* Header & Metric Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Caloric Intake &amp; Health Score Trends
            </h3>
            <p className="text-xs text-slate-400">
              Daily calories consumed and wellness/adherence score over time
            </p>
          </div>
        </div>

        {/* Quick stat badges */}
        {hasData && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5 text-xs">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-slate-400">Avg:</span>
              <span className="font-mono font-bold text-slate-100">
                {formatCalories(stats.avgCalories)}
              </span>
            </div>

            {stats.avgScore != null && (
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-slate-400">Score:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {Math.round(stats.avgScore)}/100
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="mt-6">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-200">
              No health trend data available
            </h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Log day consumption on the meal planner to evaluate daily caloric
              targets and adherence scores.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={healthTrends}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={formatDateShort}
                />
                {/* Left Axis: Calories */}
                <YAxis
                  yAxisId="left"
                  stroke="#f59e0b"
                  fontSize={11}
                  tickFormatter={(val) => `${val} kcal`}
                  width={65}
                />
                {/* Right Axis: Health Score */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#10b981"
                  fontSize={11}
                  tickFormatter={(val) => `${val}`}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof healthTrends[0];
                      return (
                        <div className="rounded-xl border border-slate-700/80 bg-slate-900 p-3 shadow-2xl text-xs space-y-1.5">
                          <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
                            {label ? formatDateShort(String(label)) : ''}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <Flame className="h-3 w-3" />
                              <span>Calories:</span>
                            </span>
                            <span className="font-mono font-bold text-white">
                              {formatCalories(item.totalCalories)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              <Sparkles className="h-3 w-3" />
                              <span>Health Score:</span>
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {item.avgHealthScore != null
                                ? `${Math.round(item.avgHealthScore)} / 100`
                                : 'Not scored'}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Calorie Area */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalCalories"
                  fill="url(#calorieGradient)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Calories"
                />
                {/* Health Score Line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgHealthScore"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#020617', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                  connectNulls
                  name="Health Score"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend & Note */}
      {hasData && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Calories (Left Axis)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Health Score (Right Axis)</span>
            </div>
          </div>
          <span className="hidden sm:inline text-slate-500 text-[11px]">
            Target score: 80+
          </span>
        </div>
      )}
    </div>
  );
}
