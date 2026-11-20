'use client';

import { useState, useTransition, useId } from 'react';
import {
  Plus,
  X,
  Trash2,
  Sparkles,
  ChefHat,
  AlertCircle,
  DollarSign,
  Flame,
} from 'lucide-react';
import {
  createRecipeWithIngredients,
  type CreateRecipeFullInput,
} from '@/app/actions/kora';
import { formatCurrency, formatCalories } from './utils';

interface IngredientRowState {
  id: string;
  name: string;
  quantity_used: string;
  unit: string;
  pack_size: string;
  pack_cost: string;
  calories_per_unit: string;
}

const DEFAULT_UNITS = ['g', 'ml', 'pcs', 'cup', 'tbsp', 'tsp', 'oz', 'serving'];

interface CreateRecipeModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function CreateRecipeModal({
  isOpen,
  onOpen,
  onClose,
  onSuccess,
}: CreateRecipeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRowState[]>([
    {
      id: 'ing-1',
      name: '',
      quantity_used: '',
      unit: 'g',
      pack_size: '1000',
      pack_cost: '',
      calories_per_unit: '',
    },
  ]);

  const uniqueId = useId();

  const handleAddIngredientRow = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        quantity_used: '',
        unit: 'g',
        pack_size: '1000',
        pack_cost: '',
        calories_per_unit: '',
      },
    ]);
  };

  const handleRemoveIngredientRow = (id: string) => {
    if (ingredients.length <= 1) return;
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const handleIngredientChange = (
    id: string,
    field: keyof Omit<IngredientRowState, 'id'>,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Live Calculations
  const calculatedCost = ingredients.reduce((sum, ing) => {
    const qty = parseFloat(ing.quantity_used) || 0;
    const packSize = parseFloat(ing.pack_size) || 0;
    const packCost = parseFloat(ing.pack_cost) || 0;
    if (qty <= 0 || packSize <= 0 || packCost < 0) return sum;
    return sum + qty * (packCost / packSize);
  }, 0);

  const calculatedCalories = ingredients.reduce((sum, ing) => {
    const qty = parseFloat(ing.quantity_used) || 0;
    const calPerUnit = parseFloat(ing.calories_per_unit) || 0;
    if (qty <= 0 || calPerUnit < 0) return sum;
    return sum + qty * calPerUnit;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }

    // Build input payload
    const formattedIngredients = ingredients
      .filter((ing) => ing.name.trim() !== '')
      .map((ing) => {
        const qty = parseFloat(ing.quantity_used);
        const packSize = parseFloat(ing.pack_size);
        const packCost = parseFloat(ing.pack_cost);
        const cal = parseFloat(ing.calories_per_unit);

        return {
          name: ing.name.trim(),
          unit: ing.unit.trim() || 'g',
          quantity_used: isNaN(qty) ? 0 : qty,
          pack_size: isNaN(packSize) || packSize <= 0 ? 1000 : packSize,
          pack_cost: isNaN(packCost) || packCost < 0 ? 0 : packCost,
          calories_per_unit: isNaN(cal) || cal < 0 ? 0 : cal,
        };
      });

    // Validate quantities
    for (const ing of formattedIngredients) {
      if (ing.quantity_used <= 0) {
        setError(`Quantity used for "${ing.name}" must be greater than 0`);
        return;
      }
    }

    const payload: CreateRecipeFullInput = {
      name: name.trim(),
      notes: notes.trim() || null,
      ingredients: formattedIngredients,
    };

    startTransition(async () => {
      const res = await createRecipeWithIngredients(payload);
      if (res.success) {
        // Reset form
        setName('');
        setNotes('');
        setIngredients([
          {
            id: 'ing-1',
            name: '',
            quantity_used: '',
            unit: 'g',
            pack_size: '1000',
            pack_cost: '',
            calories_per_unit: '',
          },
        ]);
        onClose();
        await onSuccess();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      {/* Floating Emerald + Button */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Create Recipe"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-500/40 transition-transform duration-200 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-emerald-500/40 cursor-pointer"
        title="Create New Recipe"
      >
        <Plus className="h-7 w-7 stroke-[2.6] transition-transform group-hover:rotate-90 duration-300" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="modal-title"
                    className="text-lg font-bold text-white tracking-tight"
                  >
                    Create New Recipe
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define ingredients, unit economics, and nutrition.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Recipe Meta */}
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor={`recipe-name-${uniqueId}`}
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Recipe Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    id={`recipe-name-${uniqueId}`}
                    type="text"
                    required
                    placeholder="e.g. Honey Garlic Salmon Bowl"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`recipe-notes-${uniqueId}`}
                    className="block text-xs font-semibold text-slate-300 mb-1"
                  >
                    Notes or Preparation Tips{' '}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id={`recipe-notes-${uniqueId}`}
                    rows={2}
                    placeholder="Quick 15-minute meal prep with high protein..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Dynamic Ingredients Section */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Recipe Ingredients
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Pack info automatically saves to your pantry catalog
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {ingredients.map((ing, idx) => (
                    <div
                      key={ing.id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 relative group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                        <span>Ingredient #{idx + 1}</span>
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientRow(ing.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded-md hover:bg-rose-950/40 transition-colors"
                            title="Remove ingredient"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Row Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                        {/* Name */}
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                            Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Rolled Oats"
                            value={ing.name}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'name',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Quantity Used */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                            Qty Used
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="80"
                            value={ing.quantity_used}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'quantity_used',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Unit */}
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                            Unit
                          </label>
                          <input
                            type="text"
                            list="units-list"
                            placeholder="g"
                            value={ing.unit}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'unit',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Economics & Calories */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                            Pack Size
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="1000"
                            value={ing.pack_size}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'pack_size',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                            Pack Cost ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="4.99"
                            value={ing.pack_cost}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'pack_cost',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                            Cal / Unit
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="3.8"
                            value={ing.calories_per_unit}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'calories_per_unit',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <datalist id="units-list">
                  {DEFAULT_UNITS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              {/* Calculated Summary Bar */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs">
                <span className="font-semibold text-slate-400">
                  Estimated Recipe Profile
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{formatCurrency(calculatedCost)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Flame className="h-3.5 w-3.5" />
                    <span>{formatCalories(calculatedCalories)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Recipe</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateRecipeModal;
