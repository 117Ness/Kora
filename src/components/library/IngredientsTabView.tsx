'use client';

import { useState, useTransition, useMemo } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { Ingredient } from '@/types/kora';
import { updateIngredient, deleteIngredient } from '@/app/actions/kora';
import {
  formatCurrency,
  formatUnitCost,
  formatCaloriesPerUnit,
} from './utils';
import { CreateIngredientModal } from './CreateIngredientModal';

interface IngredientsTabViewProps {
  ingredients: Ingredient[];
  onDataChange: () => Promise<void>;
}

interface InlineEditState {
  pack_size: string;
  pack_cost: string;
  calories_per_unit: string;
}

export function IngredientsTabView({
  ingredients,
  onDataChange,
}: IngredientsTabViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Inline editing state: maps ingredientId -> edit form values
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<InlineEditState>({
    pack_size: '',
    pack_cost: '',
    calories_per_unit: '',
  });
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    const q = searchQuery.toLowerCase().trim();
    return ingredients.filter(
      (ing) =>
        ing.name.toLowerCase().includes(q) ||
        ing.unit.toLowerCase().includes(q)
    );
  }, [ingredients, searchQuery]);

  const startEditing = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditValues({
      pack_size: String(ing.pack_size),
      pack_cost: String(ing.pack_cost),
      calories_per_unit: String(ing.calories_per_unit ?? 0),
    });
    setInlineError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setInlineError(null);
  };

  const handleSaveInline = (ingredientId: string) => {
    const size = parseFloat(editValues.pack_size);
    const cost = parseFloat(editValues.pack_cost);
    const cals = parseFloat(editValues.calories_per_unit || '0');

    if (isNaN(size) || size <= 0) {
      setInlineError('Pack size must be greater than 0');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setInlineError('Pack cost must be 0 or greater');
      return;
    }

    setInlineError(null);
    startSaveTransition(async () => {
      const res = await updateIngredient(ingredientId, {
        pack_size: size,
        pack_cost: cost,
        calories_per_unit: isNaN(cals) ? 0 : cals,
      });

      if (!res.success) {
        setInlineError(res.error);
        return;
      }

      setEditingId(null);
      await onDataChange();
    });
  };

  const handleDelete = (ingredientId: string) => {
    startDeleteTransition(async () => {
      const res = await deleteIngredient(ingredientId);
      if (res.success) {
        setDeletingId(null);
        await onDataChange();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ingredients by name or unit..."
            className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 transition-colors shrink-0"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>New Ingredient</span>
        </button>
      </div>

      {/* Ingredients List */}
      {filteredIngredients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
            <Layers className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-semibold text-slate-200">
            {searchQuery ? 'No matching ingredients found' : 'No ingredients created yet'}
          </h4>
          <p className="mt-1 text-xs text-slate-400 max-w-xs">
            {searchQuery
              ? `No ingredients matched "${searchQuery}"`
              : 'Ingredients created during recipe formulation will automatically populate here.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Add Raw Ingredient</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop Table Header */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
            <div className="col-span-3">Ingredient Name</div>
            <div className="col-span-2 text-right">Pack Size &amp; Unit</div>
            <div className="col-span-2 text-right">Pack Cost</div>
            <div className="col-span-2 text-right">Unit Rate</div>
            <div className="col-span-2 text-right">Calories / Unit</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>

          {/* Ingredient Rows */}
          <div className="divide-y divide-slate-800/60 rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-lg shadow-slate-950/40">
            {filteredIngredients.map((ing) => {
              const isInlineEditing = editingId === ing.id;
              const isConfirmingDelete = deletingId === ing.id;

              const liveSize = isInlineEditing
                ? parseFloat(editValues.pack_size) || 0
                : ing.pack_size;
              const liveCost = isInlineEditing
                ? parseFloat(editValues.pack_cost) || 0
                : ing.pack_cost;
              const computedRate = formatUnitCost(liveCost, liveSize, ing.unit);

              return (
                <div
                  key={ing.id}
                  className={`p-3.5 sm:px-4 sm:py-3 transition-colors ${
                    isInlineEditing
                      ? 'bg-slate-800/40 ring-1 ring-inset ring-emerald-500/30'
                      : 'hover:bg-slate-800/20'
                  }`}
                >
                  {/* Delete Confirmation Row */}
                  {isConfirmingDelete && (
                    <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                          <span>
                            Delete <strong>{ing.name}</strong>? Any recipes using this will lose this ingredient.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setDeletingId(null)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(ing.id)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Error Notice */}
                  {isInlineEditing && inlineError && (
                    <div className="mb-2 text-xs text-rose-400 font-medium">
                      {inlineError}
                    </div>
                  )}

                  {/* Desktop Grid Layout */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center text-xs">
                    {/* Name */}
                    <div className="col-span-3 flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-semibold text-slate-100 truncate">
                        {ing.name}
                      </span>
                    </div>

                    {/* Pack Size & Unit */}
                    <div className="col-span-2 text-right">
                      {isInlineEditing ? (
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={editValues.pack_size}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pack_size: e.target.value,
                              }))
                            }
                            className="w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-100 text-right focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">
                            {ing.unit}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">
                          {ing.pack_size} {ing.unit}
                        </span>
                      )}
                    </div>

                    {/* Pack Cost */}
                    <div className="col-span-2 text-right">
                      {isInlineEditing ? (
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span className="text-slate-400 font-mono text-[11px]">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValues.pack_cost}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pack_cost: e.target.value,
                              }))
                            }
                            className="w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-100 text-right focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">
                          {formatCurrency(Number(ing.pack_cost))}
                        </span>
                      )}
                    </div>

                    {/* Computed Unit Cost */}
                    <div className="col-span-2 text-right">
                      <span className="font-bold text-emerald-400 font-mono">
                        {computedRate}
                      </span>
                    </div>

                    {/* Calories / Unit */}
                    <div className="col-span-2 text-right">
                      {isInlineEditing ? (
                        <div className="inline-flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editValues.calories_per_unit}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                calories_per_unit: e.target.value,
                              }))
                            }
                            className="w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-slate-100 text-right focus:outline-none focus:border-emerald-500 font-mono"
                          />
                          <span className="text-slate-400 font-mono text-[10px]">
                            kcal
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-mono">
                          {formatCaloriesPerUnit(ing.calories_per_unit, ing.unit)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      {isInlineEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveInline(ing.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors disabled:opacity-50"
                            title="Save inline changes"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={cancelEditing}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Cancel editing"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(ing)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-emerald-400 border border-slate-700/50 transition-colors"
                            title="Edit pack size, cost & calories"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(ing.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/60 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-700/50 transition-colors"
                            title="Delete ingredient"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile / Narrow Screen Card Layout */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="font-bold text-sm text-slate-100">
                          {ing.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isInlineEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveInline(ing.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
                            >
                              <Check className="h-3 w-3 stroke-[2.5]" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={cancelEditing}
                              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(ing)}
                              className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-emerald-400 border border-slate-700/50 transition-colors"
                              title="Edit pack size, cost & calories"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(ing.id)}
                              className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-rose-400 border border-slate-700/50 transition-colors"
                              title="Delete ingredient"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile Detail Fields */}
                    {isInlineEditing ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Pack Size ({ing.unit})
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={editValues.pack_size}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pack_size: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Pack Cost ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editValues.pack_cost}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pack_cost: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Calories / {ing.unit}
                          </label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={editValues.calories_per_unit}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                calories_per_unit: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                            Computed Rate
                          </label>
                          <div className="h-8 flex items-center font-bold text-emerald-400 text-xs font-mono">
                            {computedRate}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div>
                          <span className="block text-[10px] uppercase text-slate-400">
                            Pack
                          </span>
                          <span className="font-mono text-slate-200">
                            {ing.pack_size} {ing.unit}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-slate-400">
                            Pack Cost
                          </span>
                          <span className="font-mono text-slate-200">
                            {formatCurrency(Number(ing.pack_cost))}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-slate-400">
                            Unit Rate
                          </span>
                          <span className="font-mono font-semibold text-emerald-400">
                            {computedRate}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-slate-400">
                            Calories
                          </span>
                          <span className="font-mono text-slate-200">
                            {formatCaloriesPerUnit(ing.calories_per_unit, ing.unit)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Ingredient Modal */}
      <CreateIngredientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onDataChange}
      />
    </div>
  );
}
