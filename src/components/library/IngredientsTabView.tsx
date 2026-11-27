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
  Scale,
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
  weight_per_unit_g: string;
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
    weight_per_unit_g: '',
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
      weight_per_unit_g: ing.weight_per_unit_g ? String(ing.weight_per_unit_g) : '',
    });
    setInlineError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setInlineError(null);
  };

  const handleSaveInline = (ingredientId: string, currentUnit: string) => {
    const size = parseFloat(editValues.pack_size);
    const cost = parseFloat(editValues.pack_cost);
    const cals = parseFloat(editValues.calories_per_unit || '0');
    const wtG = editValues.weight_per_unit_g ? parseFloat(editValues.weight_per_unit_g) : null;

    if (isNaN(size) || size <= 0) {
      setInlineError('Pack size must be greater than 0');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setInlineError('Pack cost must be 0 or greater');
      return;
    }
    if (wtG !== null && (isNaN(wtG) || wtG <= 0)) {
      setInlineError('Average weight per piece must be greater than 0');
      return;
    }

    setInlineError(null);
    startSaveTransition(async () => {
      const res = await updateIngredient(ingredientId, {
        pack_size: size,
        pack_cost: cost,
        calories_per_unit: isNaN(cals) ? 0 : cals,
        weight_per_unit_g: currentUnit === 'pcs' ? wtG : undefined,
      });

      if (res.success) {
        setEditingId(null);
        await onDataChange();
      } else {
        setInlineError(res.error);
      }
    });
  };

  const handleDelete = (ingredientId: string) => {
    setInlineError(null);
    startDeleteTransition(async () => {
      const res = await deleteIngredient(ingredientId);
      if (res.success) {
        setDeletingId(null);
        await onDataChange();
      } else {
        setInlineError(res.error);
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pantry ingredients by name or unit..."
            className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-10 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-xs border border-[#7A7463] transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span>New Ingredient</span>
          </button>
        </div>
      </div>

      {/* Ingredients List / Table */}
      {filteredIngredients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] text-[#7A7463]">
            <Layers className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h4 className="mt-3 font-serif text-sm font-bold text-[#3E3C32]">
            {searchQuery ? 'No matching ingredients found' : 'No ingredients created yet'}
          </h4>
          <p className="mt-1 text-xs text-[#7D7765] max-w-xs font-sans">
            {searchQuery
              ? `No ingredients matched "${searchQuery}"`
              : 'Ingredients created during recipe formulation will automatically populate here.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#7A7463] text-[#F7F2E7] hover:bg-[#696353] border border-[#7A7463] transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Add Raw Ingredient</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop Table Header with hairline divider */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] border-b border-[#C8BFA8] font-sans">
            <div className="col-span-3">Ingredient Name</div>
            <div className="col-span-2 text-right">Pack Size &amp; Unit</div>
            <div className="col-span-2 text-right">Pack Cost (₹)</div>
            <div className="col-span-2 text-right">Unit Rate</div>
            <div className="col-span-2 text-right">Calories / Unit</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>

          {/* Clean Itemized Ingredient Rows with Hairline Dividers */}
          <div className="divide-y divide-[#C8BFA8] rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] overflow-hidden shadow-xs">
            {filteredIngredients.map((ing) => {
              const isInlineEditing = editingId === ing.id;
              const isConfirmingDelete = deletingId === ing.id;
              const isCountUnit = ing.unit === 'pcs' || ing.unit === 'crate' || ing.unit === 'dozen';

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
                      ? 'bg-[#F7F2E7] ring-1 ring-inset ring-[#7A7463]/50'
                      : 'hover:bg-[#E4DCCB]/60'
                  }`}
                >
                  {/* Delete Confirmation Row */}
                  {isConfirmingDelete && (
                    <div className="mb-3 rounded-xl border border-[#B86B4B]/40 bg-[#B86B4B]/10 p-3 text-xs text-[#B86B4B]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-[#B86B4B] shrink-0" strokeWidth={1.5} />
                          <span>
                            Delete <strong>{ing.name}</strong>? Any recipes using this will lose this ingredient.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-1 rounded-full text-xs font-medium text-[#7D7765] hover:bg-[#EBE3D2] border border-[#C8BFA8] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(ing.id)}
                            className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#B86B4B] hover:bg-[#A05A3D] text-[#F7F2E7] transition-colors disabled:opacity-50 shadow-xs"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inline Error Notice */}
                  {isInlineEditing && inlineError && (
                    <div className="mb-2 text-xs text-[#B86B4B] font-medium font-sans">
                      {inlineError}
                    </div>
                  )}

                  {/* Desktop Grid Layout */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center text-xs">
                    {/* Name & Metadata */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#7A7463] shrink-0" />
                        <span className="font-serif font-bold text-[#3E3C32] truncate">
                          {ing.name}
                        </span>
                      </div>
                      {/* Weight per piece tag for pcs */}
                      {isCountUnit && ing.weight_per_unit_g && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-[#7D7765] pl-4 font-sans">
                          <Scale className="h-3 w-3 text-[#7A7463]" strokeWidth={1.5} />
                          <span>{ing.weight_per_unit_g}g / pc</span>
                        </div>
                      )}
                    </div>

                    {/* Pack Size & Unit (Dynamic label: Pack Size (pcs)) */}
                    <div className="col-span-2 text-right">
                      {isInlineEditing ? (
                        <div className="flex flex-col items-end gap-1">
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
                              className="w-20 rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] text-right focus:outline-none focus:border-[#7A7463] font-mono"
                            />
                            <span className="text-[#7D7765] font-mono text-[11px]">
                              {ing.unit}
                            </span>
                          </div>
                          {isCountUnit && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-[#7D7765]">
                              <span>Avg wt:</span>
                              <input
                                type="number"
                                step="any"
                                min="0.1"
                                placeholder="g/pc"
                                value={editValues.weight_per_unit_g}
                                onChange={(e) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    weight_per_unit_g: e.target.value,
                                  }))
                                }
                                className="w-14 rounded-md bg-[#F7F2E7] border border-[#C8BFA8] px-1.5 py-0.5 text-[10px] text-right focus:outline-none focus:border-[#7A7463] font-mono"
                              />
                              <span>g</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[#3E3C32] font-mono font-medium">
                            {ing.pack_size} {ing.unit}
                          </span>
                          <span className="text-[10px] text-[#7D7765] font-sans">
                            {isCountUnit ? 'Pack Size (pcs)' : `Pack (${ing.unit})`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pack Cost in ₹ */}
                    <div className="col-span-2 text-right">
                      {isInlineEditing ? (
                        <div className="inline-flex items-center gap-1 justify-end">
                          <span className="text-[#7D7765] font-mono text-[11px]">₹</span>
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
                            className="w-20 rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] text-right focus:outline-none focus:border-[#7A7463] font-mono"
                          />
                        </div>
                      ) : (
                        <span className="text-[#3E3C32] font-mono font-medium">
                          {formatCurrency(Number(ing.pack_cost))}
                        </span>
                      )}
                    </div>

                    {/* Computed Unit Rate (e.g. ₹7.00 / pc) */}
                    <div className="col-span-2 text-right">
                      <span className="font-bold text-[#7A7463] font-mono">
                        {computedRate}
                      </span>
                    </div>

                    {/* Calories / Unit (e.g. 75 kcal / pc) */}
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
                            className="w-20 rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] text-right focus:outline-none focus:border-[#7A7463] font-mono"
                          />
                          <span className="text-[#7D7765] font-mono text-[10px]">
                            {isCountUnit ? 'kcal/pc' : 'kcal'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#3E3C32] font-mono">
                          {formatCaloriesPerUnit(ing.calories_per_unit, ing.unit)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-center gap-1.5">
                      {isInlineEditing ? (
                        <>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveInline(ing.id, ing.unit)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] transition-colors disabled:opacity-50 shadow-xs"
                            title="Save inline changes"
                          >
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={cancelEditing}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F2E7] text-[#7D7765] hover:text-[#3E3C32] border border-[#C8BFA8] transition-colors"
                            title="Cancel editing"
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(ing)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F2E7] text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#E4DCCB] border border-[#C8BFA8] transition-colors shadow-xs"
                            title="Edit pack size, cost & calories"
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(ing.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F2E7] text-[#B86B4B] hover:bg-[#B86B4B]/15 border border-[#C8BFA8] transition-colors shadow-xs"
                            title="Delete ingredient"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile / Narrow Screen Card Layout */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#7A7463] shrink-0" />
                          <span className="font-serif font-bold text-sm text-[#3E3C32]">
                            {ing.name}
                          </span>
                        </div>
                        {isCountUnit && ing.weight_per_unit_g && (
                          <span className="text-[11px] text-[#7D7765] pl-4 font-sans block mt-0.5">
                            {ing.weight_per_unit_g}g per piece
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isInlineEditing ? (
                          <>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => handleSaveInline(ing.id, ing.unit)}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] font-semibold text-xs transition-colors disabled:opacity-50 shadow-xs"
                            >
                              <Check className="h-3 w-3 stroke-[2.5]" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={cancelEditing}
                              className="p-1 rounded-full bg-[#F7F2E7] text-[#7D7765] hover:text-[#3E3C32] border border-[#C8BFA8] transition-colors"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(ing)}
                              className="p-1.5 rounded-full bg-[#F7F2E7] text-[#7D7765] hover:text-[#3E3C32] border border-[#C8BFA8] transition-colors shadow-xs"
                              title="Edit pack size, cost & calories"
                            >
                              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(ing.id)}
                              className="p-1.5 rounded-full bg-[#F7F2E7] text-[#B86B4B] hover:bg-[#B86B4B]/15 border border-[#C8BFA8] transition-colors shadow-xs"
                              title="Delete ingredient"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mobile Detail Fields */}
                    {isInlineEditing ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#C8BFA8]/70">
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-[#7D7765] mb-1 font-sans">
                            {isCountUnit ? 'Pack Size (pcs)' : `Pack (${ing.unit})`}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editValues.pack_size}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pack_size: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-1 text-xs text-[#3E3C32] focus:outline-none focus:border-[#7A7463]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-[#7D7765] mb-1 font-sans">
                            Pack Cost (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editValues.pack_cost}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                pack_cost: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-1 text-xs text-[#3E3C32] focus:outline-none focus:border-[#7A7463]"
                          />
                        </div>
                        {isCountUnit && (
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-[#7D7765] mb-1 font-sans">
                              Avg. Wt/pc (g)
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="50"
                              value={editValues.weight_per_unit_g}
                              onChange={(e) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  weight_per_unit_g: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-1 text-xs text-[#3E3C32] focus:outline-none focus:border-[#7A7463]"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-[#7D7765] mb-1 font-sans">
                            {isCountUnit ? 'Calories / pc' : 'Cal / Unit'}
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editValues.calories_per_unit}
                            onChange={(e) =>
                              setEditValues((prev) => ({
                                ...prev,
                                calories_per_unit: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-1 text-xs text-[#3E3C32] focus:outline-none focus:border-[#7A7463]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-semibold text-[#7D7765] mb-1 font-sans">
                            Live Rate
                          </label>
                          <span className="block px-2.5 py-1 text-xs font-bold text-[#7A7463] font-mono">
                            {computedRate}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#C8BFA8]/70 text-xs">
                        <div>
                          <span className="block text-[10px] uppercase text-[#7D7765] font-sans">
                            {isCountUnit ? 'Pack (pcs)' : 'Pack'}
                          </span>
                          <span className="font-mono text-[#3E3C32]">
                            {ing.pack_size} {ing.unit}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#7D7765] font-sans">
                            Cost
                          </span>
                          <span className="font-mono text-[#3E3C32]">
                            {formatCurrency(Number(ing.pack_cost))}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase text-[#7D7765] font-sans">
                            Rate
                          </span>
                          <span className="font-mono font-bold text-[#7A7463]">
                            {computedRate}
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

      {/* Create Ingredient Modal */}
      <CreateIngredientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onDataChange}
      />
    </div>
  );
}

export default IngredientsTabView;