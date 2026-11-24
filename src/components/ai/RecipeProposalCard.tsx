'use client';

import { useState, useTransition } from 'react';
import {
  BookmarkPlus,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  IndianRupee,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { acceptProposedRecipe } from '@/app/actions/ai-chef';
import { formatINR } from '@/lib/units';
import type {
  ProposedRecipePayload,
  ScaledRecipePayload,
  ProposedRecipeIngredient,
} from '@/types/ai';

interface RecipeProposalCardProps {
  proposal: ProposedRecipePayload | ScaledRecipePayload | Record<string, unknown>;
  onDiscard?: () => void;
  onAccepted?: (res: { recipeId: string; recipeName: string }) => void;
  defaultExpanded?: boolean;
}

export function RecipeProposalCard({
  proposal,
  onDiscard,
  onAccepted,
  defaultExpanded = false,
}: RecipeProposalCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isPending, startTransition] = useTransition();
  const [savedStatus, setSavedStatus] = useState<'idle' | 'saved' | 'added_today'>('idle');
  const [isDiscarded, setIsDiscarded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extract common proposal fields safely
  const isScaled =
    (proposal as ScaledRecipePayload).type === 'scaled_recipe' ||
    Boolean((proposal as ScaledRecipePayload).scale_factor);

  const title =
    (proposal as ProposedRecipePayload).name ||
    (proposal as ScaledRecipePayload).recipe_title ||
    'AI Curated Recipe';

  const description = (proposal as ProposedRecipePayload).description || '';

  const mealCategory = (proposal as ProposedRecipePayload).meal_category || 'meal';

  const servings =
    (proposal as ProposedRecipePayload).servings ||
    (proposal as ScaledRecipePayload).updated_servings ||
    1;

  const cookware = (proposal as ProposedRecipePayload).cookware_needed || [];

  const ingredients: ProposedRecipeIngredient[] =
    (proposal as ProposedRecipePayload).ingredients ||
    (proposal as ScaledRecipePayload).scaled_ingredients ||
    [];

  const instructions: string[] =
    (proposal as ProposedRecipePayload).instructions ||
    (proposal as ScaledRecipePayload).updated_instructions ||
    [];

  const nutrition =
    (proposal as ProposedRecipePayload).total_nutrition ||
    (proposal as ScaledRecipePayload).recalculated_nutrition || {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fats_g: 0,
    };

  const totalCost =
    (proposal as ProposedRecipePayload).total_cost_inr ||
    (proposal as ScaledRecipePayload).recalculated_cost_inr ||
    0;

  const costPerServing =
    (proposal as ProposedRecipePayload).cost_per_serving_inr ||
    (servings > 0 ? totalCost / servings : totalCost);

  const replaceRecipeId = (proposal as ScaledRecipePayload).recipe_id || undefined;

  // Handle Save to Library
  const handleSaveToLibrary = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await acceptProposedRecipe(proposal, {
        replaceRecipeId,
      });

      if (res.success) {
        setSavedStatus('saved');
        onAccepted?.(res.data);
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  // Handle Add to Today
  const handleAddToToday = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await acceptProposedRecipe(proposal, {
        addToDate: todayStr,
        replaceRecipeId,
      });

      if (res.success) {
        setSavedStatus('added_today');
        onAccepted?.(res.data);
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  // Handle Discard
  const handleDiscard = () => {
    setIsDiscarded(true);
    onDiscard?.();
  };

  if (isDiscarded) {
    return (
      <div className="rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-4 text-center text-xs text-[#7D7765]">
        <span>Recipe proposal discarded.</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-4 sm:p-5 shadow-xs transition-all hover:border-[#7A7463]/70">
      {/* Top Header: Category Pill & Cost */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center rounded-full border border-[#7A7463]/30 bg-[#F7F2E7] px-2.5 py-0.5 text-[10px] font-semibold text-[#7A7463] uppercase tracking-wider font-sans">
            {mealCategory}
          </span>
          {isScaled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
              <RefreshCw className="h-2.5 w-2.5" />
              <span>Scaled (x{(proposal as ScaledRecipePayload).scale_factor?.toFixed(2) ?? '1'})</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#7A7463]">
          <IndianRupee className="h-3.5 w-3.5" />
          <span>{formatINR(totalCost).replace('₹', '')}</span>
          <span className="text-[10px] font-normal text-[#7D7765]">
            (~{formatINR(costPerServing)}/srv)
          </span>
        </div>
      </div>

      {/* Recipe Title & Description */}
      <h3 className="font-serif text-lg font-bold text-[#3E3C32] leading-tight mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#7D7765] line-clamp-2 mb-3 font-sans">
          {description}
        </p>
      )}

      {/* Cookware Badges Row */}
      {cookware.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="text-[10px] text-[#7D7765] flex items-center gap-1">
            <Flame className="h-3 w-3 text-[#7A7463]" />
            <span>Cookware:</span>
          </span>
          {cookware.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full border border-[#C8BFA8] bg-[#F7F2E7] px-2 py-0.5 text-[10px] font-medium text-[#3E3C32]"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Macro Breakdown Strip */}
      <div className="grid grid-cols-4 gap-2 rounded-xl bg-[#F7F2E7] border border-[#C8BFA8]/80 p-2 text-center text-xs mb-3">
        <div>
          <span className="block text-[10px] text-[#7D7765]">Calories</span>
          <span className="font-mono font-bold text-[#3E3C32]">
            {Math.round(nutrition.calories)}
          </span>
          <span className="text-[9px] text-[#7D7765] ml-0.5">kcal</span>
        </div>
        <div>
          <span className="block text-[10px] text-[#7D7765]">Protein</span>
          <span className="font-mono font-bold text-[#7A7463]">
            {Math.round(nutrition.protein_g)}
          </span>
          <span className="text-[9px] text-[#7D7765] ml-0.5">g</span>
        </div>
        <div>
          <span className="block text-[10px] text-[#7D7765]">Carbs</span>
          <span className="font-mono font-bold text-[#3E3C32]">
            {Math.round(nutrition.carbs_g)}
          </span>
          <span className="text-[9px] text-[#7D7765] ml-0.5">g</span>
        </div>
        <div>
          <span className="block text-[10px] text-[#7D7765]">Fats</span>
          <span className="font-mono font-bold text-[#3E3C32]">
            {Math.round(nutrition.fats_g)}
          </span>
          <span className="text-[9px] text-[#7D7765] ml-0.5">g</span>
        </div>
      </div>

      {/* Collapsible Ingredients & Instructions */}
      <div className="border-t border-[#C8BFA8]/70 pt-2 mb-3">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#7A7463] hover:text-[#3E3C32] transition-colors py-1"
        >
          <span>
            {isExpanded ? 'Hide Ingredients & Steps' : `View ${ingredients.length} Ingredients & Steps`}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3 animate-fade-in text-xs">
            {/* Ingredients List */}
            <div>
              <span className="block font-semibold text-[#3E3C32] mb-1.5 text-[11px] uppercase tracking-wider">
                Normalized Ingredients:
              </span>
              <ul className="space-y-1">
                {ingredients.map((ing, idx) => (
                  <li
                    key={`${ing.name}-${idx}`}
                    className="flex items-center justify-between text-[#3E3C32] bg-[#F7F2E7]/80 rounded-lg px-2.5 py-1 border border-[#C8BFA8]/40"
                  >
                    <span>
                      {ing.name}{' '}
                      {ing.unit === 'pcs' && ing.weight_per_unit_g && (
                        <span className="text-[10px] text-[#7D7765]">
                          ({ing.weight_per_unit_g}g/pc)
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-medium text-[#7A7463]">
                      {ing.quantity} {ing.unit} &bull; {formatINR(ing.estimated_cost_inr)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions List */}
            {instructions.length > 0 && (
              <div>
                <span className="block font-semibold text-[#3E3C32] mb-1.5 text-[11px] uppercase tracking-wider">
                  Cooking Directions:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[#3E3C32] text-[11px] leading-relaxed">
                  {instructions.map((step, idx) => (
                    <li key={idx} className="pl-1">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div className="mb-3 text-[11px] text-red-800 bg-red-100/70 rounded-xl p-2 border border-red-300">
          {errorMessage}
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#C8BFA8]">
        <button
          type="button"
          onClick={handleDiscard}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#7D7765] hover:text-red-700 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          <span>Discard</span>
        </button>

        <div className="flex items-center gap-2">
          {savedStatus === 'saved' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 text-[#F7F2E7] px-3 py-1 text-xs font-semibold shadow-xs">
              <Check className="h-3.5 w-3.5" />
              <span>Saved ✓</span>
            </span>
          ) : savedStatus === 'added_today' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700 text-[#F7F2E7] px-3 py-1 text-xs font-semibold shadow-xs">
              <Check className="h-3.5 w-3.5" />
              <span>Added to Today ✓</span>
            </span>
          ) : (
            <>
              {replaceRecipeId && (
                <button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-full bg-[#EBE3D2] hover:bg-[#E4DCCB] text-[#3E3C32] border border-[#C8BFA8] px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Update Original</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C8BFA8] bg-[#F7F2E7] hover:bg-[#F3EDE0] px-3 py-1 text-xs font-medium text-[#3E3C32] shadow-xs transition-colors disabled:opacity-50"
              >
                <BookmarkPlus className="h-3.5 w-3.5 text-[#7A7463]" />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={handleAddToToday}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] border border-[#7A7463] px-3.5 py-1 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                <span>Add to Today</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeProposalCard;
