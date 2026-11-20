import {
  calculateRecipeCost,
  calculateRecipeCalories,
  formatCurrency,
  formatCalories,
} from '@/components/planner/utils';

export {
  calculateRecipeCost,
  calculateRecipeCalories,
  formatCurrency,
  formatCalories,
};

export function formatUnitCost(
  packCost: number | string | null | undefined,
  packSize: number | string | null | undefined,
  unit: string = ''
): string {
  const cost = typeof packCost === 'number' ? packCost : parseFloat(String(packCost ?? 0));
  const size = typeof packSize === 'number' ? packSize : parseFloat(String(packSize ?? 0));

  if (!size || size <= 0 || isNaN(cost) || isNaN(size)) {
    return '$0.00';
  }

  const unitCost = cost / size;
  const suffix = unit ? ` / ${unit}` : '';

  if (unitCost >= 1) {
    return `$${unitCost.toFixed(2)}${suffix}`;
  } else if (unitCost >= 0.01) {
    return `$${unitCost.toFixed(3)}${suffix}`;
  } else {
    return `$${unitCost.toFixed(4)}${suffix}`;
  }
}

export function formatCaloriesPerUnit(
  calories: number | string | null | undefined,
  unit: string = ''
): string {
  const cal = typeof calories === 'number' ? calories : parseFloat(String(calories ?? 0));
  if (isNaN(cal) || cal === 0) return `0 kcal${unit ? ` / ${unit}` : ''}`;
  const suffix = unit ? ` / ${unit}` : '';
  return `${Number(cal.toFixed(2))} kcal${suffix}`;
}
