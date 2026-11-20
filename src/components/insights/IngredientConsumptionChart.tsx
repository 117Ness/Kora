'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Package, Utensils, BarChart3, LineChart as LineIcon } from 'lucide-react';
import type { InsightsAnalytics } from '@/lib/analytics';
import { formatCurrency, formatDateShort, CHART_PALETTE } from './utils';

interface IngredientConsumptionChartProps {
  data: InsightsAnalytics;
}

export function IngredientConsumptionChart({
  data,
}: IngredientConsumptionChartProps) {
  const { ingredientConsumption } = data;
  const [viewMode, setViewMode] = useState<'top' | 'daily'>('top');
  const [metric, setMetric] = useState<'cost' | 'quantity'>('cost');

  const topIngredients = useMemo(() => {
    const list = [...ingredientConsumption.cumulativeTotals];
    if (metric === 'cost') {
      list.sort((a, b) => b.totalCost - a.totalCost);
    } else {
      list.sort((a, b) => b.totalQuantity - a.totalQuantity);
    }
    return list.slice(0, 10);
  }, [ingredientConsumption.cumulativeTotals, metric]);

  // Aggregate daily total quantity and cost across all ingredients
  const dailyTotals = useMemo(() => {
    const map = new Map<string, { date: string; totalCost: number; totalQuantity: number; count: number }>();
    for (const pt of ingredientConsumption.dailySeries) {
      const existing = map.get(pt.date);
      if (existing) {
        existing.totalCost += pt.cost;
        existing.totalQuantity += pt.quantityConsumed;
        existing.count += 1;
      } else {
        map.set(pt.date, {
          date: pt.date,
          totalCost: pt.cost,
          totalQuantity: pt.quantityConsumed,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [ingredientConsumption.dailySeries]);

  const hasData = ingredientConsumption.cumulativeTotals.length > 0;

  return (
    <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 p-5 sm:p-6 shadow-xl shadow-slate-950/40">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Ingredient Consumption
            </h3>
            <p className="text-xs text-slate-400">
              {viewMode === 'top'
                ? 'Top 10 consumed pantry items this month'
                : 'Daily pantry consumption activity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher: Top vs Daily */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('top')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'top'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Top Items</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'daily'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" />
              <span>Daily Volume</span>
            </button>
          </div>

          {/* Metric Switcher (only for Top view) */}
          {viewMode === 'top' && (
            <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setMetric('cost')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  metric === 'cost'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                By Cost ($)
              </button>
              <button
                type="button"
                onClick={() => setMetric('quantity')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  metric === 'quantity'
                    ? 'bg-slate-800 text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                By Quantity
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-6">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
              <Utensils className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-200">
              No consumption recorded this month
            </h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Log daily meals on the Plan page to track ingredient burn rates,
              inventory depletion, and cost trends.
            </p>
          </div>
        ) : viewMode === 'top' ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topIngredients}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) =>
                    metric === 'cost' ? `$${val}` : `${val}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="ingredientName"
                  stroke="#94a3b8"
                  fontSize={11}
                  width={110}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof topIngredients[0];
                      return (
                        <div className="rounded-xl border border-slate-700/80 bg-slate-900 p-3 shadow-2xl text-xs space-y-1">
                          <p className="font-bold text-white text-sm">
                            {item.ingredientName}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>Quantity Consumed:</span>
                            <span className="font-mono font-semibold text-cyan-400">
                              {item.totalQuantity} {item.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300">
                            <span>Total Spend:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCurrency(item.totalCost)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey={metric === 'cost' ? 'totalCost' : 'totalQuantity'}
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                >
                  {topIngredients.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.ingredientId}`}
                      fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyTotals}
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={formatDateShort}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof dailyTotals[0];
                      return (
                        <div className="rounded-xl border border-slate-700/80 bg-slate-900 p-3 shadow-2xl text-xs space-y-1">
                          <p className="font-semibold text-slate-300">
                            {label ? formatDateShort(String(label)) : ''}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-slate-200">
                            <span>Daily Spend:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCurrency(item.totalCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px]">
                            <span>Items logged:</span>
                            <span>{item.count} ingredients</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCost"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#020617', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#34d399' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
