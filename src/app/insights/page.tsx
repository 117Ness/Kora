import { Suspense } from 'react';
import { getInsightsData } from '@/app/actions/kora';
import { InsightsView } from '@/components/insights/InsightsView';
import { computeInsightsAnalytics } from '@/lib/analytics';

async function InsightsDataLoader() {
  const result = await getInsightsData();

  // If result is successful, use data; otherwise fallback to safe empty analytics
  const data = result.success
    ? result.data
    : computeInsightsAnalytics([], [], []);

  return <InsightsView initialData={data} />;
}

export default function InsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs font-medium">
            Loading kitchen insights &amp; analytics...
          </span>
        </div>
      }
    >
      <InsightsDataLoader />
    </Suspense>
  );
}
