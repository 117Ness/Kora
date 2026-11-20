'use client';

import { useState, useTransition } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import type { InsightsAnalytics } from '@/lib/analytics';
import { getInsightsData } from '@/app/actions/kora';
import { SummaryKpiCards } from './SummaryKpiCards';
import { IngredientConsumptionChart } from './IngredientConsumptionChart';
import { HealthTrendChart } from './HealthTrendChart';
import { BudgetPredictionChart } from './BudgetPredictionChart';

interface InsightsViewProps {
  initialData: InsightsAnalytics;
}

export function InsightsView({ initialData }: InsightsViewProps) {
  const [data, setData] = useState<InsightsAnalytics>(initialData);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const handleRefresh = () => {
    startRefreshTransition(async () => {
      const res = await getInsightsData();
      if (res.success) {
        setData(res.data);
      }
    });
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Page Header / Hero Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Kitchen Intelligence &amp; Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time financial burn rates, nutritional intake trends, and predictive
            pantry forecasting for {data.boundaries.monthLabel}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <span>{data.boundaries.monthLabel}</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors disabled:opacity-50"
            title="Refresh analytics dataset"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <SummaryKpiCards data={data} />

      {/* Charts Row 1: Ingredient Consumption & Health Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IngredientConsumptionChart data={data} />
        <HealthTrendChart data={data} />
      </div>

      {/* Chart Row 2: Budget Prediction & Per-Ingredient Forecast Table */}
      <BudgetPredictionChart data={data} />
    </div>
  );
}

export default InsightsView;
