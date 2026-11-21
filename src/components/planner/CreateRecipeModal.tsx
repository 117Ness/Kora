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
import { OliveSprigSvg } from '@/components/BotanicalAccents';

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
    return sum + (qty * packCost) / packSize;
  }, 0);

  const calculatedCalories = ingredients.reduce((sum, ing) => {
    const qty = parseFloat(ing.quantity_used) || 0;
    const calPerUnit = parseFloat(ing.calories_per_unit) || 0;
    if (qty <= 0 || calPerUnit < 0) return sum;
    return sum + qty * calPerUnit;
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }

    const validIngredients = ingredients.filter(
      (ing) => ing.name.trim() !== ''
    );
    if (validIngredients.length === 0) {
      setError('At least one ingredient with a valid name is required');
      return;
    }

    for (const ing of validIngredients) {
      const qty = parseFloat(ing.quantity_used);
      const size = parseFloat(ing.pack_size);
      const cost = parseFloat(ing.pack_cost);
      const cals = parseFloat(ing.calories_per_unit || '0');

      if (isNaN(qty) || qty <= 0) {
        setError(`Quantity for "${ing.name}" must be greater than 0`);
        return;
      }
      if (isNaN(size) || size <= 0) {
        setError(`Pack size for "${ing.name}" must be greater than 0`);
        return;
      }
      if (isNaN(cost) || cost < 0) {
        setError(`Pack cost for "${ing.name}" must be 0 or greater`);
        return;
      }
      if (isNaN(cals) || cals < 0) {
        setError(`Calories for "${ing.name}" must be 0 or greater`);
        return;
      }
    }

    setError(null);

    const payload: CreateRecipeFullInput = {
      name: name.trim(),
      notes: notes.trim() || undefined,
      ingredients: validIngredients.map((ing) => ({
        name: ing.name.trim(),
        unit: ing.unit.trim() || 'g',
        pack_size: parseFloat(ing.pack_size) || 1000,
        pack_cost: parseFloat(ing.pack_cost) || 0,
        calories_per_unit: parseFloat(ing.calories_per_unit) || 0,
        quantity_used: parseFloat(ing.quantity_used) || 0,
      })),
    };

    startTransition(async () => {
      const res = await createRecipeWithIngredients(payload);
      if (res.success) {
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
      {/* Floating Solid Olive-Taupe + Button at bottom-6 right-6 */}
      <button
        type="button"
        onClick={onOpen}
        aria-label="Create Recipe"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-xl border border-[#C8BFA8] transition-transform duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#7A7463] cursor-pointer"
        title="Create New Recipe"
      >
        <Plus className="h-6 w-6 stroke-[2.2] transition-transform group-hover:rotate-90 duration-300" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E3C32]/45 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#F3EDE0] border border-[#C8BFA8] p-6 sm:p-7 shadow-2xl space-y-6 text-[#3E3C32]"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#C8BFA8] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
                  <ChefHat className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3
                      id="modal-title"
                      className="font-serif text-xl font-bold text-[#3E3C32] tracking-tight"
                    >
                      Create New Recipe
                    </h3>
                    <OliveSprigSvg className="h-5 w-5 text-[#7A7463]/70 hidden sm:block" />
                  </div>
                  <p className="text-xs text-[#7D7765] font-sans">
                    Define ingredients, unit economics, and nutrition.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] border border-[#C8BFA8]/60 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#B86B4B]/15 border border-[#B86B4B]/40 text-[#B86B4B] text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
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
                    className="block text-xs font-semibold text-[#3E3C32] mb-1 font-sans uppercase tracking-wider"
                  >
                    Recipe Name <span className="text-[#B86B4B]">*</span>
                  </label>
                  <input
                    id={`recipe-name-${uniqueId}`}
                    type="text"
                    required
                    placeholder="e.g. Rosemary Roasted Chicken"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-sm text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`recipe-notes-${uniqueId}`}
                    className="block text-xs font-semibold text-[#3E3C32] mb-1 font-sans uppercase tracking-wider"
                  >
                    Notes or Preparation Tips{' '}
                    <span className="text-[#7D7765] font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id={`recipe-notes-${uniqueId}`}
                    rows={2}
                    placeholder="Slow cooked with olive oil, garlic, and fresh herbs..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] resize-none shadow-xs transition-colors"
                  />
                </div>
              </div>

              {/* Dynamic Ingredients Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif text-sm font-bold text-[#3E3C32]">
                      Ingredients &amp; Unit Economics
                    </h4>
                    <p className="text-[11px] text-[#7D7765] font-sans">
                      Ingredient cost will calculate automatically from pack price and usage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EBE3D2] hover:bg-[#E4DCCB] text-[#3E3C32] border border-[#C8BFA8] shadow-xs transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#C8BFA8]">
                  {ingredients.map((ing, idx) => (
                    <div
                      key={ing.id}
                      className="p-3.5 rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif text-xs font-semibold text-[#3E3C32]">
                          #{idx + 1} Ingredient Item
                        </span>
                        {ingredients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientRow(ing.id)}
                            className="p-1 rounded-full text-[#B86B4B] hover:bg-[#B86B4B]/15 transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Name */}
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-[#7D7765] uppercase">
                            Name
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Extra Virgin Olive Oil"
                            value={ing.name}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'name',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-1.5 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="block text-[10px] font-semibold text-[#7D7765] uppercase">
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
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2.5 py-1.5 text-xs text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#C8BFA8]/60">
                        <div>
                          <label className="block text-[10px] font-semibold text-[#7D7765] uppercase">
                            Qty Used
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="15"
                            value={ing.quantity_used}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'quantity_used',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#7D7765] uppercase">
                            Pack Size
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="500"
                            value={ing.pack_size}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'pack_size',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#7D7765] uppercase">
                            Pack Cost ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="8.50"
                            value={ing.pack_cost}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'pack_cost',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#7D7765] uppercase">
                            Cal / Unit
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="8.8"
                            value={ing.calories_per_unit}
                            onChange={(e) =>
                              handleIngredientChange(
                                ing.id,
                                'calories_per_unit',
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg bg-[#F7F2E7] border border-[#C8BFA8] px-2 py-1 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
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
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] text-xs">
                <span className="font-serif font-bold text-[#3E3C32]">
                  Estimated Recipe Profile
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-[#3E3C32] font-bold">
                    <DollarSign className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={2} />
                    <span className="font-serif">{formatCurrency(calculatedCost)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#3E3C32] font-bold">
                    <Flame className="h-3.5 w-3.5 text-[#B86B4B]" strokeWidth={2} />
                    <span className="font-serif">{formatCalories(calculatedCalories)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#C8BFA8]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-sm border border-[#7A7463] transition-all disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
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
