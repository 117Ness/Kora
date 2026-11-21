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
    <div className="rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 sm:p-6 shadow-xs">
      {/* Header & Metric Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C8BFA8] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#B86B4B] border border-[#C8BFA8] shadow-xs">
            <HeartPulse className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[#3E3C32] tracking-tight">
              Caloric Intake &amp; Health Score Trends
            </h3>
            <p className="text-xs text-[#7D7765] font-sans">
              Daily calories consumed and wellness/adherence score over time
            </p>
          </div>
        </div>

        {/* Quick stat badges */}
        {hasData && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-1.5 text-xs shadow-xs">
              <Flame className="h-3.5 w-3.5 text-[#B86B4B]" strokeWidth={2} />
              <span className="text-[#7D7765] font-sans">Avg:</span>
              <span className="font-serif font-bold text-[#3E3C32]">
                {formatCalories(stats.avgCalories)}
              </span>
            </div>

            {stats.avgScore != null && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-1.5 text-xs shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-[#6B7F5E]" strokeWidth={1.5} />
                <span className="text-[#7D7765] font-sans">Score:</span>
                <span className="font-serif font-bold text-[#6B7F5E]">
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
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] text-[#7A7463]">
              <Activity className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h4 className="mt-3 font-serif text-sm font-bold text-[#3E3C32]">
              No health trend data available
            </h4>
            <p className="mt-1 text-xs text-[#7D7765] max-w-sm font-sans">
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
                    <stop offset="5%" stopColor="#B86B4B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#B86B4B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#C8BFA8" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  stroke="#7D7765"
                  fontSize={11}
                  tickFormatter={formatDateShort}
                />
                {/* Left Axis: Calories in Terracotta #B86B4B */}
                <YAxis
                  yAxisId="left"
                  stroke="#B86B4B"
                  fontSize={11}
                  tickFormatter={(val) => `${val} kcal`}
                  width={65}
                />
                {/* Right Axis: Health Score in Sage #6B7F5E */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  stroke="#6B7F5E"
                  fontSize={11}
                  tickFormatter={(val) => `${val}`}
                  width={35}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof healthTrends[0];
                      return (
                        <div className="rounded-2xl border border-[#C8BFA8] bg-[#F3EDE0] p-3.5 shadow-xl text-xs space-y-1.5 text-[#3E3C32]">
                          <p className="font-serif font-bold text-[#3E3C32] border-b border-[#C8BFA8] pb-1">
                            {label ? formatDateShort(String(label)) : ''}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-[#B86B4B] font-medium">
                              <Flame className="h-3 w-3" strokeWidth={2} />
                              <span>Calories:</span>
                            </span>
                            <span className="font-serif font-bold text-[#3E3C32]">
                              {formatCalories(item.totalCalories)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-[#6B7F5E] font-medium">
                              <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                              <span>Health Score:</span>
                            </span>
                            <span className="font-serif font-bold text-[#6B7F5E]">
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
                {/* Calorie Area in Terracotta #B86B4B */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalCalories"
                  fill="url(#calorieGradient)"
                  stroke="#B86B4B"
                  strokeWidth={2}
                  name="Calories"
                />
                {/* Health Score Line in Sage #6B7F5E */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgHealthScore"
                  stroke="#6B7F5E"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#6B7F5E', stroke: '#F7F2E7', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#6B7F5E' }}
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
        <div className="mt-3 flex items-center justify-between text-xs text-[#7D7765] border-t border-[#C8BFA8]/70 pt-3 font-sans">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#B86B4B]" />
              <span className="text-[#3E3C32]">Calories (Left Axis)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#6B7F5E]" />
              <span className="text-[#3E3C32]">Health Score (Right Axis)</span>
            </div>
          </div>
          <span className="hidden sm:inline text-[#7D7765] text-[11px]">
            Target score: 80+
          </span>
        </div>
      )}
    </div>
  );
}

export default HealthTrendChart;
