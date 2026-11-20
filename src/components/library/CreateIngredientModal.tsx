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
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950 transition-all z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">New Pantry Ingredient</h3>
              <p className="text-xs text-slate-400">
                Register a raw grocery item with packaging cost
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Ingredient Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rolled Oats, Greek Yogurt, Olive Oil"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Unit <span className="text-emerald-400">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                {DEFAULT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Pack Size ({unit}) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Pack Cost ($) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={packCost}
                onChange={(e) => setPackCost(e.target.value)}
                placeholder="4.99"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Calories / {unit}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={caloriesPerUnit}
                onChange={(e) => setCaloriesPerUnit(e.target.value)}
                placeholder="3.8"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Computed Unit Cost Preview */}
          <div className="flex items-center justify-between rounded-xl bg-slate-950/70 p-3 border border-slate-800/80 text-xs">
            <span className="text-slate-400">Computed Unit Rate:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {previewUnitCost}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Add Ingredient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
