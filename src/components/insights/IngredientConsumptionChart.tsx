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
    <div className="rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 sm:p-6 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C8BFA8] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
            <Package className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-[#3E3C32] tracking-tight">
              Ingredient Consumption
            </h3>
            <p className="text-xs text-[#7D7765] font-sans">
              {viewMode === 'top'
                ? 'Top 10 consumed pantry items this month'
                : 'Daily pantry consumption activity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher Pills: Top vs Daily */}
          <div className="flex items-center rounded-full bg-[#F7F2E7] p-1 border border-[#C8BFA8] shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('top')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                viewMode === 'top'
                  ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                  : 'text-[#7D7765] hover:text-[#3E3C32]'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Top Items</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                viewMode === 'daily'
                  ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                  : 'text-[#7D7765] hover:text-[#3E3C32]'
              }`}
            >
              <LineIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Daily Volume</span>
            </button>
          </div>

          {/* Metric Switcher Pills (only for Top view) */}
          {viewMode === 'top' && (
            <div className="flex items-center rounded-full bg-[#F7F2E7] p-1 border border-[#C8BFA8] shadow-xs">
              <button
                type="button"
                onClick={() => setMetric('cost')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  metric === 'cost'
                    ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                    : 'text-[#7D7765] hover:text-[#3E3C32]'
                }`}
              >
                By Cost (₹)
              </button>
              <button
                type="button"
                onClick={() => setMetric('quantity')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  metric === 'quantity'
                    ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                    : 'text-[#7D7765] hover:text-[#3E3C32]'
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
          <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] text-[#7A7463]">
              <Utensils className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <h4 className="mt-3 font-serif text-sm font-bold text-[#3E3C32]">
              No consumption recorded this month
            </h4>
            <p className="mt-1 text-xs text-[#7D7765] max-w-sm font-sans">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#C8BFA8" opacity={0.6} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#7D7765"
                  fontSize={11}
                  tickFormatter={(val) =>
                    metric === 'cost' ? `₹${val}` : `${val}`
                  }
                />
                <YAxis
                  type="category"
                  dataKey="ingredientName"
                  stroke="#3E3C32"
                  fontSize={11}
                  width={110}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(200, 191, 168, 0.25)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof topIngredients[0];
                      return (
                        <div className="rounded-2xl border border-[#C8BFA8] bg-[#F3EDE0] p-3.5 shadow-xl text-xs space-y-1.5 text-[#3E3C32]">
                          <p className="font-serif font-bold text-[#3E3C32] text-sm border-b border-[#C8BFA8] pb-1">
                            {item.ingredientName}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-[#7D7765]">
                            <span>Quantity Consumed:</span>
                            <span className="font-mono font-semibold text-[#6B7F5E]">
                              {item.totalQuantity} {item.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#7D7765]">
                            <span>Total Spend:</span>
                            <span className="font-serif font-bold text-[#7A7463]">
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
                  barSize={14}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#C8BFA8" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  stroke="#7D7765"
                  fontSize={11}
                  tickFormatter={formatDateShort}
                />
                <YAxis
                  stroke="#7D7765"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val}`}
                  width={55}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as typeof dailyTotals[0];
                      return (
                        <div className="rounded-2xl border border-[#C8BFA8] bg-[#F3EDE0] p-3.5 shadow-xl text-xs space-y-1.5 text-[#3E3C32]">
                          <p className="font-serif font-bold text-[#3E3C32] border-b border-[#C8BFA8] pb-1">
                            {formatDateShort(String(label))}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-[#7D7765]">
                            <span>Total Day Spend:</span>
                            <span className="font-serif font-bold text-[#7A7463]">
                              {formatCurrency(item.totalCost)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-[#7D7765]">
                            <span>Pantry Items Logged:</span>
                            <span className="font-mono text-[#3E3C32]">
                              {item.count} items
                            </span>
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
                  stroke="#7A7463"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#7A7463', stroke: '#F7F2E7', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#7A7463' }}
                  name="Daily Burn (₹)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer Notes */}
      {hasData && (
        <div className="mt-4 flex items-center justify-between text-xs text-[#7D7765] border-t border-[#C8BFA8]/70 pt-3 font-sans">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#7A7463]" />
              <span>Olive (Primary Items)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#6B7F5E]" />
              <span>Sage (Produce / Fresh)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#B86B4B]" />
              <span>Terracotta (Proteins)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#C49A45]" />
              <span>Ochre (Pantry Essentials)</span>
            </div>
          </div>
          <span className="text-[11px] text-[#7D7765]">
            Updated live from consumption logs
          </span>
        </div>
      )}
    </div>
  );
}

export default IngredientConsumptionChart;
