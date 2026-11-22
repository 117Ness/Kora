'use client';

import { useState, useTransition } from 'react';
import { X, AlertCircle, PackagePlus, IndianRupee } from 'lucide-react';
import { createIngredient } from '@/app/actions/kora';
import { formatUnitCost } from './utils';

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
  const [weightPerUnitG, setWeightPerUnitG] = useState('');

  if (!isOpen) return null;

  const isCountItem = unit === 'pcs' || unit === 'crate' || unit === 'dozen';

  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit);
    // Smart default pack sizes
    if (newUnit === 'pcs' && (packSize === '1000' || packSize === '500')) {
      setPackSize('1');
    } else if (newUnit === 'crate') {
      setPackSize('30');
    } else if (newUnit === 'dozen') {
      setPackSize('12');
    } else if ((newUnit === 'g' || newUnit === 'ml') && (packSize === '1' || packSize === '12' || packSize === '30')) {
      setPackSize('1000');
    } else if (newUnit === 'kg' || newUnit === 'L') {
      setPackSize('1');
    }
  };

  const getPackSizeLabel = () => {
    if (unit === 'pcs') return 'Pack Size (pcs)';
    if (unit === 'crate') return 'Pack Size (crate) – 30 pcs';
    if (unit === 'dozen') return 'Pack Size (dozen) – 12 pcs';
    if (unit === 'kg') return 'Pack Size (kg) – converts to 1,000g in DB';
    if (unit === 'L') return 'Pack Size (L) – converts to 1,000ml in DB';
    if (unit === 'tbsp') return 'Pack Size (tbsp) – converts to 15ml in DB';
    if (unit === 'tsp') return 'Pack Size (tsp) – converts to 5ml in DB';
    return `Pack Size (${unit})`;
  };

  const getCaloriesLabel = () => {
    if (isCountItem) return 'Calories / pc';
    if (unit === 'g' || unit === 'kg') return 'Calories / g';
    if (unit === 'ml' || unit === 'L' || unit === 'tbsp' || unit === 'tsp') return 'Calories / ml';
    return `Calories / ${unit}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ingredient name is required');
      return;
    }
    const size = parseFloat(packSize);
    const cost = parseFloat(packCost);
    const cals = parseFloat(caloriesPerUnit || '0');
    const wtG = weightPerUnitG ? parseFloat(weightPerUnitG) : null;

    if (isNaN(size) || size <= 0) {
      setError('Pack size must be greater than 0');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setError('Pack cost must be 0 or greater');
      return;
    }
    if (wtG !== null && (isNaN(wtG) || wtG <= 0)) {
      setError('Average weight per piece must be greater than 0');
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
        weight_per_unit_g: wtG,
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
      setWeightPerUnitG('');
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
      <div className="relative w-full max-w-md rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] p-6 sm:p-7 shadow-2xl transition-all z-10 text-[#3E3C32] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8BFA8] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <PackagePlus className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3E3C32] tracking-tight">New Pantry Ingredient</h3>
              <p className="text-xs text-[#7D7765] font-sans">
                Register grocery item with unit economics and nutritional profile
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
              placeholder="e.g. Farm Fresh Eggs, Toor Dal, Sunflower Oil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Grouped Unit of Measure Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                Unit of Measure <span className="text-[#B86B4B]">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3 py-2 text-xs text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
              >
                <optgroup label="Weight">
                  <option value="g">g (grams)</option>
                  <option value="kg">kg (kilograms → 1,000g)</option>
                </optgroup>
                <optgroup label="Volume">
                  <option value="ml">ml (milliliters)</option>
                  <option value="L">L (liters → 1,000ml)</option>
                  <option value="tbsp">tbsp (tablespoon → 15ml)</option>
                  <option value="tsp">tsp (teaspoon → 5ml)</option>
                </optgroup>
                <optgroup label="Count">
                  <option value="pcs">pcs (pieces / units)</option>
                  <option value="crate">crate (30 eggs → 30 pcs)</option>
                  <option value="dozen">dozen (12 pcs)</option>
                </optgroup>
              </select>
            </div>

            {/* Dynamic Pack Size */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                {getPackSizeLabel()} <span className="text-[#B86B4B]">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.001"
                required
                placeholder={isCountItem ? '1' : '1000'}
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors font-mono"
              />
            </div>
          </div>

          {/* Conditional Avg. Weight per Piece (g) for count items */}
          {isCountItem && (
            <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3.5 space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1 font-sans">
                Avg. Weight per Piece (g){' '}
                <span className="text-[#7D7765] font-normal font-sans">(optional)</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                placeholder="e.g. 50g for egg, 80g for medium onion, 90g for tomato"
                value={weightPerUnitG}
                onChange={(e) => setWeightPerUnitG(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors font-mono"
              />
              <p className="text-[11px] text-[#7D7765] font-sans pt-1">
                Enables piece ↔ gram conversions (e.g. 2 eggs = 100g in nutrition tracking).
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                Pack Cost (₹) <span className="text-[#B86B4B]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="₹85.00"
                value={packCost}
                onChange={(e) => setPackCost(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
                {getCaloriesLabel()}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={caloriesPerUnit}
                onChange={(e) => setCaloriesPerUnit(e.target.value)}
                className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors font-mono"
              />
            </div>
          </div>

          {/* Unit Cost Preview Pill with IndianRupee */}
          <div className="flex items-center justify-between rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] px-4 py-3 text-xs">
            <span className="text-[#7D7765] font-sans flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={2} />
              <span>Computed Unit Rate:</span>
            </span>
            <span className="font-bold text-[#7A7463] font-mono text-sm">
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