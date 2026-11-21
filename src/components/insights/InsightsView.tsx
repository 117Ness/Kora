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
import { OliveSprigSvg } from '@/components/BotanicalAccents';

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
    <div className="space-y-8 pb-28">
      {/* Page Header / Hero Bar with hairline divider and serif title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C8BFA8] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <TrendingUp className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#3E3C32] sm:text-3xl">
              Kitchen Intelligence &amp; Analytics
            </h1>
            <OliveSprigSvg className="h-5 w-5 text-[#7A7463] hidden sm:block opacity-75" />
          </div>
          <p className="text-xs sm:text-sm text-[#7D7765] mt-1.5 max-w-2xl font-sans">
            Real-time financial burn rates, nutritional intake trends, and predictive
            pantry forecasting for {data.boundaries.monthLabel}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#EBE3D2] border border-[#C8BFA8] px-3.5 py-1.5 text-xs text-[#3E3C32] shadow-xs font-sans">
            <Calendar className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.5} />
            <span className="font-medium">{data.boundaries.monthLabel}</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EBE3D2] hover:bg-[#E4DCCB] text-[#3E3C32] border border-[#C8BFA8] shadow-xs transition-colors disabled:opacity-50"
            title="Refresh analytics dataset"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-[#7A7463] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              strokeWidth={1.5}
            />
            <span>{isRefreshing ? 'Recalculating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <SummaryKpiCards data={data} />

      {/* Chart 1: Financial Burn & Monthly Projections */}
      <BudgetPredictionChart data={data} />

      {/* Chart 2: Caloric Intake & Health Adherence */}
      <HealthTrendChart data={data} />

      {/* Chart 3: Ingredient Consumption breakdown */}
      <IngredientConsumptionChart data={data} />
    </div>
  );
}

export default InsightsView;
