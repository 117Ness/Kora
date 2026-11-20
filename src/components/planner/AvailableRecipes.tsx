'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  DollarSign,
  Flame,
  Search,
  Check,
  Sparkles,
} from 'lucide-react';
import type { RecipeWithIngredients } from '@/types/kora';
import { addRecipeToDay } from '@/app/actions/kora';
import {
  DAYS_OF_WEEK,
  calculateRecipeCost,
  calculateRecipeCalories,
  formatCurrency,
  formatCalories,
} from './utils';

interface AvailableRecipesProps {
  selectedDay: number;
  recipes: RecipeWithIngredients[];
  onDataChange: () => Promise<void>;
  onOpenCreateModal?: () => void;
}

export function AvailableRecipes({
  selectedDay,
  recipes,
  onDataChange,
  onOpenCreateModal,
}: AvailableRecipesProps) {
  const [isPending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{
    recipeId: string;
    message: string;
  } | null>(null);

  const dayName = DAYS_OF_WEEK[selectedDay];

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase().trim();
    return recipes.filter((r) => {
      const matchName = r.name.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchIngredients = r.recipe_ingredients?.some((ri) =>
        ri.ingredient?.name?.toLowerCase().includes(q)
      );
      return matchName || matchNotes || matchIngredients;
    });
  }, [recipes, searchQuery]);

  const handleAdd = (recipe: RecipeWithIngredients) => {
    setAddingId(recipe.id);
    startTransition(async () => {
      const res = await addRecipeToDay(selectedDay, recipe.id, 1);
      if (res.success) {
        await onDataChange();
        setFeedback({
          recipeId: recipe.id,
          message: `Added to ${dayName}!`,
        });
        setTimeout(() => {
          setFeedback((curr) =>
            curr?.recipeId === recipe.id ? null : curr
          );
        }, 2500);
      }
      setAddingId(null);
    });
  };

  return (
    <section className="space-y-4 pt-4 border-t border-slate-900">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-100">Recipe Library</h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
            <BookOpen className="h-6 w-6 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              {searchQuery ? 'No recipes match your search' : 'No recipes created yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery
                ? 'Try a different ingredient name or clear the search query.'
                : 'Build your collection of nutritious, cost-effective meals.'}
            </p>
          </div>
          {onOpenCreateModal && !searchQuery && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Recipe</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRecipes.map((recipe) => {
            const cost = calculateRecipeCost(recipe);
            const calories = calculateRecipeCalories(recipe);
            const isAdding = addingId === recipe.id;
            const hasRecentFeedback = feedback?.recipeId === recipe.id;

            return (
              <div
                key={recipe.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm"
              >
                <div className="space-y-2.5">
                  {/* Title & Notes */}
                  <div>
                    <h4 className="text-base font-bold text-white tracking-tight line-clamp-1">
                      {recipe.name}
                    </h4>
                    {recipe.notes ? (
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 italic">
                        {recipe.notes}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Standard recipe profile
                      </p>
                    )}
                  </div>

                  {/* Cost & Calories Badges */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(cost)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
                      <Flame className="h-3 w-3" />
                      {formatCalories(calories)}
                    </span>
                  </div>

                  {/* Ingredients Badges */}
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Ingredients ({recipe.recipe_ingredients?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-none">
                      {recipe.recipe_ingredients?.length ? (
                        recipe.recipe_ingredients.map((ri) => (
                          <span
                            key={ri.id || ri.ingredient_id}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-950/80 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
                          >
                            <span>{ri.ingredient?.name || 'Item'}</span>
                            <span className="text-slate-400 text-[10px]">
                              {ri.quantity_used}
                              {ri.ingredient?.unit || ''}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No ingredients linked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-4 mt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    disabled={isPending || isAdding}
                    onClick={() => handleAdd(recipe)}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      hasRecentFeedback
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 border border-slate-700 hover:border-emerald-400'
                    } disabled:opacity-50`}
                  >
                    {hasRecentFeedback ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{feedback.message}</span>
                      </>
                    ) : isAdding ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add to {dayName}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AvailableRecipes;
