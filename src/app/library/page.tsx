import { Suspense } from 'react';
import { getLibraryData } from '@/app/actions/kora';
import { LibraryAccordions } from '@/components/library/LibraryAccordions';

async function LibraryDataLoader() {
  const result = await getLibraryData();

  const recipes = result.success ? result.data.recipes : [];
  const ingredients = result.success ? result.data.ingredients : [];

  return (
    <LibraryAccordions
      initialRecipes={recipes}
      initialIngredients={ingredients}
    />
  );
}

export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-medium">Loading recipe & pantry library...</span>
        </div>
      }
    >
      <LibraryDataLoader />
    </Suspense>
  );
}
