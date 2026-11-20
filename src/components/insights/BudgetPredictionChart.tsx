'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Search,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { InsightsAnalytics } from '@/lib/analytics';
import { formatCurrency } from './utils';

interface BudgetPredictionChartProps {
  data: InsightsAnalytics;
}

export function BudgetPredictionChart({ data }: BudgetPredictionChartProps) {
  const { budget, boundaries, ingredientProjections, ingredientConsumption } = data;
  const [tableSearch, setTableSearch] = useState('');
  const [showAllRows, setShowAllRows] = useState(false);

  // Build daily timeline from day 1 to daysInMonth
  const timelineData = useMemo(() => {
    // Map existing daily spend
    const dailySpendMap = new Map<number, number>();
    for (const pt of ingredientConsumption.dailySeries) {
      const parts = pt.date.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        dailySpendMap.set(dayNum, (dailySpendMap.get(dayNum) || 0) + pt.cost);
      }
    }

    const points = [];
    let runningActual = 0;
    const currentDay = boundaries.daysElapsed;
    const daysInMonth = boundaries.daysInMonth;

    for (let day = 1; day <= daysInMonth; day++) {
      const dailySpend = dailySpendMap.get(day) || 0;

      if (day <= currentDay) {
        runningActual += dailySpend;
        points.push({
          day: `Day ${day}`,
          dayNumber: day,
          actualDaily: dailySpend > 0 ? parseFloat(dailySpend.toFixed(2)) : null,
          actualCumulative: parseFloat(runningActual.toFixed(2)),
          projectedCumulative:
            day === currentDay ? parseFloat(runningActual.toFixed(2)) : null,
        });
      } else {
        // Projected days
        const daysFromNow = day - currentDay;
        const projected = budget.spentSoFar + budget.avgDailyBurn * daysFromNow;
        points.push({
          day: `Day ${day}`,
          dayNumber: day,
          actualDaily: null,
          actualCumulative: null,
          projectedCumulative: parseFloat(projected.toFixed(2)),
        });
      }
    }

    return points;
  }, [
    boundaries.daysElapsed,
    boundaries.daysInMonth,
    budget.spentSoFar,
    budget.avgDailyBurn,
    ingredientConsumption.dailySeries,
  ]);

  // Filtered ingredients for projection table
  const filteredProjections = useMemo(() => {
    if (!tableSearch.trim()) return ingredientProjections;
    const q = tableSearch.toLowerCase().trim();
    return ingredientProjections.filter(
      (p) =>
        p.ingredientName.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
    );
  }, [ingredientProjections, tableSearch]);

  const displayedProjections = showAllRows
    ? filteredProjections
    : filteredProjections.slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Chart Section */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 p-5 sm:p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Budget Burn &amp; Monthly Trajectory
              </h3>
              <p className="text-xs text-slate-400">
                Cumulative spend to date alongside projected end-of-month target (
                {boundaries.monthLabel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Actual Spend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-slate-300">Projected Forecast</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timelineData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="day"
                stroke="#64748b"
                fontSize={11}
                interval={Math.floor(boundaries.daysInMonth / 6)}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `$${val}`}
                width={55}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as typeof timelineData[0];
                    return (
                      <div className="rounded-xl border border-slate-700/80 bg-slate-900 p-3 shadow-2xl text-xs space-y-1.5">
                        <p className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
                          {label} ({boundaries.monthLabel})
                        </p>
                        {item.actualDaily != null && item.actualDaily > 0 && (
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>Daily Spend:</span>
                            <span className="font-mono font-medium text-slate-100">
                              {formatCurrency(item.actualDaily)}
                            </span>
                          </div>
                        )}
                        {item.actualCumulative != null && (
                          <div className="flex items-center justify-between gap-4 text-emerald-400 font-semibold">
                            <span>Cumulative Spend:</span>
                            <span className="font-mono">
                              {formatCurrency(item.actualCumulative)}
                            </span>
                          </div>
                        )}
                        {item.projectedCumulative != null && (
                          <div className="flex items-center justify-between gap-4 text-cyan-400 font-semibold">
                            <span>Projected Cost:</span>
                            <span className="font-mono">
                              {formatCurrency(item.projectedCumulative)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Daily bars for actual spend */}
              <Bar
                dataKey="actualDaily"
                fill="#3b82f6"
                opacity={0.4}
                barSize={6}
                name="Daily Spend"
              />
              {/* Actual Cumulative Spend Area */}
              <Area
                type="monotone"
                dataKey="actualCumulative"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#actualGradient)"
                name="Actual Cumulative Spend"
              />
              {/* Projected Trajectory Line */}
              <Line
                type="monotone"
                dataKey="projectedCumulative"
                stroke="#06b6d4"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={false}
                name="Projected Forecast"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-Ingredient Monthly Quantity & Cost Prediction Table */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 p-5 sm:p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <TableIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Ingredient Quantity &amp; Spend Projections
              </h3>
              <p className="text-xs text-slate-400">
                Pantry inventory forecast extrapolated from current monthly consumption
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search ingredient..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-4">
          {filteredProjections.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {tableSearch
                ? `No ingredients matched "${tableSearch}"`
                : 'No ingredient projections available. Log meals to generate forecasts.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3 text-right">Used So Far</th>
                    <th className="py-2.5 px-3 text-right">Daily Rate</th>
                    <th className="py-2.5 px-3 text-right">Projected Qty</th>
                    <th className="py-2.5 px-3 text-right">Projected Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {displayedProjections.map((row) => (
                    <tr
                      key={row.ingredientId}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          <span>{row.ingredientName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {row.usedSoFar} {row.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {row.avgDailyUsage} {row.unit}/d
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-cyan-300">
                        {row.projectedMonthlyQuantity} {row.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(row.projectedMonthlyCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Expand/Collapse Button */}
          {filteredProjections.length > 7 && (
            <div className="mt-3 flex justify-center border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => setShowAllRows(!showAllRows)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showAllRows ? (
                  <>
                    <span>Show Fewer Ingredients</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>
                      View All {filteredProjections.length} Ingredients
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
