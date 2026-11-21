'use client';

import { useState, useTransition } from 'react';
import { X, AlertCircle, PackagePlus } from 'lucide-react';
import { createIngredient } from '@/app/actions/kora';
import { formatUnitCost } from './utils';

const DEFAULT_UNITS = ['g', 'ml', 'pcs', 'cup', 'tbsp', 'tsp', 'oz', 'serving'];

interface CreateIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export function CreateIngredientModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateIngredientModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('g');
  const [packSize, setPackSize] = useState('1000');
  const [packCost, setPackCost] = useState('');
  const [caloriesPerUnit, setCaloriesPerUnit] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ingredient name is required');
      return;
    }
    const size = parseFloat(packSize);
    const cost = parseFloat(packCost);
    const cals = parseFloat(caloriesPerUnit || '0');

    if (isNaN(size) || size <= 0) {
      setError('Pack size must be greater than 0');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setError('Pack cost must be 0 or greater');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await createIngredient({
        name: name.trim(),
        unit: unit.trim(),
        pack_size: size,
        pack_cost: cost,
        calories_per_unit: isNaN(cals) ? 0 : cals,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      await onSuccess();
      onClose();
      // Reset
      setName('');
      setPackCost('');
      setCaloriesPerUnit('');
    });
  };

  const previewUnitCost = formatUnitCost(
    parseFloat(packCost) || 0,
    parseFloat(packSize) || 0,
    unit
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#3E3C32]/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] p-6 sm:p-7 shadow-2xl transition-all z-10 text-[#3E3C32]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8BFA8] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <PackagePlus className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3E3C32] tracking-tight">New Pantry Ingredient</h3>
              <p className="text-xs text-[#7D7765] font-sans">
                Register a raw grocery item with packaging cost
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] border border-[#C8BFA8]/60 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#B86B4B]/15 border border-[#B86B4B]/40 p-3 text-xs text-[#B86B4B]">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
              Ingredient Name <span className="text-[#B86B4B]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Extra Virgin Olive Oil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                Unit of Measure
              </label>
              <input
                type="text"
                list="pantry-units"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
              />
              <datalist id="pantry-units">
                {DEFAULT_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                Pack Size ({unit || 'unit'}) <span className="text-[#B86B4B]">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                required
                placeholder="1000"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                Pack Purchase Cost ($) <span className="text-[#B86B4B]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="8.50"
                value={packCost}
                onChange={(e) => setPackCost(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                Calories / {unit || 'unit'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={caloriesPerUnit}
                onChange={(e) => setCaloriesPerUnit(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
              />
            </div>
          </div>

          {/* Unit Cost Preview Pill */}
          <div className="flex items-center justify-between rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] px-4 py-3 text-xs">
            <span className="text-[#7D7765] font-sans">Computed Unit Rate:</span>
            <span className="font-bold text-[#7A7463] font-mono">
              {previewUnitCost}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#C8BFA8]">
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
              className="px-5 py-2 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] border border-[#7A7463] shadow-xs transition-all disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Add Ingredient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateIngredientModal;
