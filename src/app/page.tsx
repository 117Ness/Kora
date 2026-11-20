import { Suspense } from 'react';
import { getPlannerData } from '@/app/actions/kora';
import { PlannerView } from '@/components/planner/PlannerView';

async function PlannerDataLoader() {
  const result = await getPlannerData();

  const dayPlans = result.success ? result.data.dayPlans : [];
  const recipes = result.success ? result.data.recipes : [];

  return (
    <PlannerView
      initialDayPlans={dayPlans}
      initialRecipes={recipes}
    />
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-medium">Loading meal planner...</span>
        </div>
      }
    >
      <PlannerDataLoader />
    </Suspense>
  );
}
