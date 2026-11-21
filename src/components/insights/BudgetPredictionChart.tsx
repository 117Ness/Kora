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
      {/* Chart Section: Trajectory and Daily Spend */}
      <div className="rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C8BFA8] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <TrendingUp className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#3E3C32] tracking-tight">
                Spend Velocity &amp; Month-End Trajectory
              </h3>
              <p className="text-xs text-[#7D7765] font-sans">
                Cumulative actual expenses alongside predictive linear forecast
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-sans">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#7A7463]" />
              <span className="text-[#3E3C32] font-medium">Actual ({formatCurrency(budget.spentSoFar)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#B86B4B]" />
              <span className="text-[#3E3C32] font-medium">Forecast ({formatCurrency(budget.projectedMonthlyCost)})</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={timelineData}
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7A7463" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7A7463" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#C8BFA8" opacity={0.6} />
              <XAxis
                dataKey="day"
                stroke="#7D7765"
                fontSize={11}
                interval={Math.floor(boundaries.daysInMonth / 6)}
              />
              <YAxis
                stroke="#7D7765"
                fontSize={11}
                tickFormatter={(val) => `$${val}`}
                width={55}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as typeof timelineData[0];
                    return (
                      <div className="rounded-2xl border border-[#C8BFA8] bg-[#F3EDE0] p-3.5 shadow-xl text-xs space-y-1.5 text-[#3E3C32]">
                        <p className="font-serif font-bold text-[#3E3C32] border-b border-[#C8BFA8] pb-1">
                          {label} ({boundaries.monthLabel})
                        </p>
                        {item.actualDaily != null && item.actualDaily > 0 && (
                          <div className="flex items-center justify-between gap-4 text-[#7D7765]">
                            <span>Daily Spend:</span>
                            <span className="font-mono font-medium text-[#3E3C32]">
                              {formatCurrency(item.actualDaily)}
                            </span>
                          </div>
                        )}
                        {item.actualCumulative != null && (
                          <div className="flex items-center justify-between gap-4 text-[#7A7463] font-semibold">
                            <span>Cumulative Spend:</span>
                            <span className="font-mono">
                              {formatCurrency(item.actualCumulative)}
                            </span>
                          </div>
                        )}
                        {item.projectedCumulative != null && (
                          <div className="flex items-center justify-between gap-4 text-[#B86B4B] font-semibold">
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
              {/* Daily bars for actual spend in Ochre #C49A45 */}
              <Bar
                dataKey="actualDaily"
                fill="#C49A45"
                opacity={0.55}
                barSize={6}
                name="Daily Spend"
              />
              {/* Actual Cumulative Spend Area in Olive #7A7463 */}
              <Area
                type="monotone"
                dataKey="actualCumulative"
                stroke="#7A7463"
                strokeWidth={2.5}
                fill="url(#actualGradient)"
                name="Actual Cumulative Spend"
              />
              {/* Projected Trajectory Line in Terracotta #B86B4B */}
              <Line
                type="monotone"
                dataKey="projectedCumulative"
                stroke="#B86B4B"
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
      <div className="rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#C8BFA8] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#6B7F5E] border border-[#C8BFA8] shadow-xs">
              <TableIcon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#3E3C32] tracking-tight">
                Ingredient Quantity &amp; Spend Projections
              </h3>
              <p className="text-xs text-[#7D7765] font-sans">
                Pantry inventory forecast extrapolated from current monthly consumption
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search ingredient..."
              className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-8 pr-3.5 py-1.5 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="mt-4">
          {filteredProjections.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#7D7765] font-sans">
              {tableSearch
                ? `No ingredients matched "${tableSearch}"`
                : 'No ingredient projections available. Log meals to generate forecasts.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#C8BFA8] text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3 text-right">Used So Far</th>
                    <th className="py-2.5 px-3 text-right">Daily Rate</th>
                    <th className="py-2.5 px-3 text-right">Projected Qty</th>
                    <th className="py-2.5 px-3 text-right">Projected Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C8BFA8]/60">
                  {displayedProjections.map((row) => (
                    <tr
                      key={row.ingredientId}
                      className="hover:bg-[#E4DCCB]/60 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-[#3E3C32]">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#6B7F5E]" />
                          <span className="font-serif">{row.ingredientName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#3E3C32]">
                        {row.usedSoFar} {row.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#7D7765]">
                        {row.avgDailyUsage} {row.unit}/d
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-[#B86B4B]">
                        {row.projectedMonthlyQuantity} {row.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#7A7463]">
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
            <div className="mt-3 flex justify-center border-t border-[#C8BFA8]/70 pt-3">
              <button
                type="button"
                onClick={() => setShowAllRows(!showAllRows)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7A7463] hover:text-[#5A5546] transition-colors"
              >
                {showAllRows ? (
                  <>
                    <span>Show Fewer Ingredients</span>
                    <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </>
                ) : (
                  <>
                    <span>
                      View All {filteredProjections.length} Ingredients
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
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

export default BudgetPredictionChart;
