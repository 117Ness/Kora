'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  IndianRupee,
  Flame,
  Search,
  Check,
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
import { HerbSprigSvg } from '@/components/BotanicalAccents';

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
    <section className="space-y-4 pt-5 border-t border-[#C8BFA8]">
      {/* Header & Pill Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#7A7463]" strokeWidth={1.5} />
          <h2 className="font-serif text-lg font-bold text-[#3E3C32]">Recipe Library</h2>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBE3D2] text-[#7D7765] border border-[#C8BFA8]">
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </span>
        </div>

        {/* Pill Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-10 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
          />
        </div>
      </div>

      {/* Available Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-10 text-center">
          <HerbSprigSvg className="h-8 w-8 text-[#7A7463]/70 mx-auto mb-2" />
          <h3 className="font-serif text-sm font-semibold text-[#3E3C32]">
            {searchQuery
              ? `No recipes match "${searchQuery}"`
              : 'Your recipe library is empty'}
          </h3>
          <p className="text-xs text-[#7D7765] max-w-sm mx-auto mt-1 font-sans">
            {searchQuery
              ? 'Try a different ingredient name or clear the search filter.'
              : 'Add your first recipe using the + button to build your kitchen collection.'}
          </p>
          {!searchQuery && onOpenCreateModal && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#7A7463] text-[#F7F2E7] hover:bg-[#696353] border border-[#7A7463] shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Create Recipe</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => {
            const cost = calculateRecipeCost(recipe);
            const calories = calculateRecipeCalories(recipe);
            const isAdding = addingId === recipe.id;
            const isAdded = feedback?.recipeId === recipe.id;
            const ingredientCount = recipe.recipe_ingredients?.length || 0;

            return (
              <div
                key={recipe.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-4 sm:p-5 transition-all hover:border-[#7A7463]/80 hover:shadow-sm shadow-xs"
              >
                {/* Botanical fine-line accent */}
                <div className="absolute right-4 top-4 opacity-25 group-hover:opacity-60 transition-opacity pointer-events-none">
                  <HerbSprigSvg className="h-5 w-5 text-[#7A7463]" />
                </div>

                <div className="space-y-2.5 relative z-10">
                  {/* Title & Notes */}
                  <div className="pr-6">
                    <h4 className="recipe-title font-serif text-base font-bold text-[#3E3C32] tracking-tight line-clamp-1">
                      {recipe.name}
                    </h4>
                    {recipe.notes ? (
                      <p className="text-xs text-[#7D7765] line-clamp-1 mt-0.5 italic font-sans">
                        {recipe.notes}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#7D7765] mt-0.5 font-sans">
                        Standard recipe profile
                      </p>
                    )}
                  </div>

                  {/* Badges strip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-0.5 text-xs font-semibold text-[#3E3C32] shadow-xs">
                      <IndianRupee className="h-3 w-3 text-[#7A7463]" strokeWidth={2} />
                      <span className="font-serif">{formatCurrency(cost)}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-0.5 text-xs font-semibold text-[#3E3C32] shadow-xs">
                      <Flame className="h-3 w-3 text-[#B86B4B]" strokeWidth={2} />
                      <span className="font-serif">{formatCalories(calories)}</span>
                    </span>

                    <span className="text-[11px] text-[#7D7765] font-sans">
                      {ingredientCount} {ingredientCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-4 pt-3 border-t border-[#C8BFA8]/70 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#7D7765]">
                    Plan for {dayName}
                  </span>

                  <button
                    type="button"
                    disabled={isPending || isAdding}
                    onClick={() => handleAdd(recipe)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                      isAdded
                        ? 'bg-[#6B7F5E] text-[#F7F2E7]'
                        : 'bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] border border-[#7A7463]'
                    } disabled:opacity-50`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>{isAdding ? 'Adding...' : 'Add to Day'}</span>
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
