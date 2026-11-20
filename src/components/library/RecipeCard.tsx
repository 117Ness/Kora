'use client';

import { useState, useTransition } from 'react';
import {
  DollarSign,
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
  const [isExpanded, setIsExpanded] = useState(true);

  const cost = calculateRecipeCost(recipe);
  const calories = calculateRecipeCalories(recipe);
  const ingredientsCount = recipe.recipe_ingredients?.length ?? 0;

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteRecipe(recipe.id);
      if (res.success) {
        setShowConfirmDelete(false);
        await onDataChange();
      }
    });
  };

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-800/90 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40 hover:border-slate-700/80 transition-all duration-200">
      {/* Top Bar: Title & Edit/Delete Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-white tracking-tight break-words">
              {recipe.name}
            </h3>
            <span className="inline-flex items-center rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
              {ingredientsCount} {ingredientsCount === 1 ? 'ingredient' : 'ingredients'}
            </span>
          </div>

          {recipe.notes ? (
            <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {recipe.notes}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-600 italic">
              No preparation notes
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(recipe)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 border border-slate-700/50 transition-colors"
            title="Edit recipe title & notes"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/60 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-700/50 transition-colors"
            title="Delete recipe"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Banner */}
      {showConfirmDelete && (
        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="font-semibold">Delete &ldquo;{recipe.name}&rdquo;?</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-300/80">
            This will permanently remove the recipe and any scheduled meal plan slots.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setShowConfirmDelete(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Stats summary pills */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-2 rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Est. Cost
            </span>
            <span className="text-sm font-bold text-slate-100">
              {formatCurrency(cost)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-950/70 p-2.5 border border-slate-800/60">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Calories
            </span>
            <span className="text-sm font-bold text-slate-100">
              {formatCalories(calories)}
            </span>
          </div>
        </div>
      </div>

      {/* Ingredients list accordion/dropdown */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-emerald-400" />
            <span>Ingredients Breakdown ({ingredientsCount})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-2.5 space-y-1.5">
            {ingredientsCount === 0 ? (
              <p className="text-xs text-slate-500 italic py-1">
                No ingredients registered for this recipe.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/50 rounded-xl bg-slate-950/50 border border-slate-800/50 overflow-hidden">
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
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-medium text-slate-200 truncate">
                          {ing?.name || 'Unnamed ingredient'}
                        </span>
                      </div>
                      <span className="text-slate-400 shrink-0 font-mono text-[11px] ml-2">
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
