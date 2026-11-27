'use client';

import { useState, useTransition } from 'react';
import {
  IndianRupee,
  Flame,
  Pencil,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import type { RecipeWithIngredients } from '@/types/kora';
import { deleteRecipe } from '@/app/actions/kora';
import {
  calculateRecipeCost,
  calculateRecipeCalories,
  formatCurrency,
  formatCalories,
} from './utils';
import { OliveSprigSvg } from '@/components/BotanicalAccents';

interface RecipeCardProps {
  recipe: RecipeWithIngredients;
  onEdit: (recipe: RecipeWithIngredients) => void;
  onDataChange: () => Promise<void>;
}

export function RecipeCard({
  recipe,
  onEdit,
  onDataChange,
}: RecipeCardProps) {
  const [isDeleting, startDeleteTransition] = useTransition();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const cost = calculateRecipeCost(recipe);
  const calories = calculateRecipeCalories(recipe);
  const ingredientsCount = recipe.recipe_ingredients?.length ?? 0;

  const handleDelete = () => {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const res = await deleteRecipe(recipe.id);
      if (res.success) {
        setShowConfirmDelete(false);
        await onDataChange();
      } else {
        setDeleteError(res.error);
      }
    });
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 shadow-xs hover:border-[#7A7463]/70 hover:shadow-sm transition-all duration-200">
      {/* Top Bar: Title & Edit/Delete Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="recipe-title font-serif text-base font-bold text-[#3E3C32] tracking-tight break-words">
              {recipe.name}
            </h3>
            <OliveSprigSvg className="h-4 w-4 text-[#7A7463]/60 hidden sm:block" />
            <span className="inline-flex items-center rounded-full bg-[#F7F2E7] px-2.5 py-0.5 text-[10px] font-semibold text-[#7D7765] border border-[#C8BFA8]">
              {ingredientsCount} {ingredientsCount === 1 ? 'ingredient' : 'ingredients'}
            </span>
          </div>

          {recipe.notes ? (
            <p className="mt-1.5 text-xs text-[#7D7765] line-clamp-2 leading-relaxed font-sans">
              {recipe.notes}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-[#7D7765]/80 italic font-sans">
              No preparation notes
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(recipe)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F2E7] text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#E4DCCB] border border-[#C8BFA8] transition-colors shadow-xs"
            title="Edit recipe title & notes"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F2E7] text-[#B86B4B] hover:bg-[#B86B4B]/15 border border-[#C8BFA8] transition-colors shadow-xs"
            title="Delete recipe"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Banner */}
      {showConfirmDelete && (
        <div className="mt-4 rounded-xl border border-[#B86B4B]/40 bg-[#B86B4B]/10 p-3.5 text-xs text-[#B86B4B]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#B86B4B] shrink-0" strokeWidth={1.5} />
            <span className="font-semibold">Delete &ldquo;{recipe.name}&rdquo;?</span>
          </div>
          <p className="mt-1 text-[11px] text-[#B86B4B]/80 font-sans">
            This will permanently remove the recipe and any scheduled meal plan slots.
          </p>
          {deleteError && (
            <p className="mt-1.5 text-[11px] font-semibold text-[#B86B4B]">
              {deleteError}
            </p>
          )}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowConfirmDelete(false)}
              className="px-3 py-1 rounded-full text-xs font-medium text-[#7D7765] hover:bg-[#EBE3D2] border border-[#C8BFA8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#B86B4B] hover:bg-[#A05A3D] text-[#F7F2E7] transition-colors disabled:opacity-50 shadow-xs"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Stats summary pills */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-[#C8BFA8]/80">
        <div className="flex items-center gap-2 rounded-xl bg-[#F7F2E7] p-2.5 border border-[#C8BFA8] shadow-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8]">
            <IndianRupee className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
              Est. Cost
            </span>
            <span className="font-serif text-sm font-bold text-[#3E3C32]">
              {formatCurrency(cost)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-[#F7F2E7] p-2.5 border border-[#C8BFA8] shadow-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBE3D2] text-[#B86B4B] border border-[#C8BFA8]">
            <Flame className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
              Calories
            </span>
            <span className="font-serif text-sm font-bold text-[#3E3C32]">
              {formatCalories(calories)}
            </span>
          </div>
        </div>
      </div>

      {/* Ingredients list accordion/dropdown */}
      <div className="mt-4 pt-3 border-t border-[#C8BFA8]/80">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#7D7765] hover:text-[#3E3C32] transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.5} />
            <span className="font-sans">Ingredients Breakdown ({ingredientsCount})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2.5 space-y-1.5">
            {ingredientsCount === 0 ? (
              <p className="text-xs text-[#7D7765] italic py-1 font-sans">
                No ingredients registered for this recipe.
              </p>
            ) : (
              <div className="divide-y divide-[#C8BFA8]/60 rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] overflow-hidden shadow-xs">
                {recipe.recipe_ingredients.map((ri) => {
                  const ing = ri.ingredient;
                  const unit = ing?.unit || '';
                  const qty = ri.quantity_used;

                  return (
                    <div
                      key={ri.id || `${ri.recipe_id}-${ri.ingredient_id}`}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7A7463] shrink-0" />
                        <span className="font-serif font-medium text-[#3E3C32] truncate">
                          {ing?.name || 'Unnamed ingredient'}
                        </span>
                      </div>
                      <span className="text-[#7D7765] shrink-0 font-mono text-[11px] ml-2">
                        {qty} {unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeCard;
