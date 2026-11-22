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
    return '₹0.00';
  }

  const unitCost = cost / size;
  const cleanUnit = unit.toLowerCase().trim();

  // If pieces / count items
  if (cleanUnit === 'pcs' || cleanUnit === 'pc' || cleanUnit === 'piece' || cleanUnit === 'pieces' || cleanUnit === 'egg' || cleanUnit === 'eggs') {
    return `₹${unitCost.toFixed(2)} / pc`;
  }
  if (cleanUnit === 'crate') {
    return `₹${(cost / 30).toFixed(2)} / pc`;
  }
  if (cleanUnit === 'dozen') {
    return `₹${(cost / 12).toFixed(2)} / pc`;
  }

  // If weight: per 100g
  if (cleanUnit === 'g' || cleanUnit === 'gram' || cleanUnit === 'grams') {
    return `₹${(unitCost * 100).toFixed(2)} / 100g`;
  }
  if (cleanUnit === 'kg' || cleanUnit === 'kilogram' || cleanUnit === 'kilograms') {
    return `₹${(unitCost / 10).toFixed(2)} / 100g`;
  }

  // If volume: per 100ml
  if (cleanUnit === 'ml' || cleanUnit === 'milliliter' || cleanUnit === 'millilitre') {
    return `₹${(unitCost * 100).toFixed(2)} / 100ml`;
  }
  if (cleanUnit === 'l' || cleanUnit === 'liter' || cleanUnit === 'litre') {
    return `₹${(unitCost / 10).toFixed(2)} / 100ml`;
  }
  if (cleanUnit === 'tbsp' || cleanUnit === 'tablespoon') {
    return `₹${unitCost.toFixed(2)} / tbsp`;
  }
  if (cleanUnit === 'tsp' || cleanUnit === 'teaspoon') {
    return `₹${unitCost.toFixed(2)} / tsp`;
  }

  if (unitCost >= 1) {
    return `₹${unitCost.toFixed(2)} / ${unit}`;
  } else if (unitCost >= 0.01) {
    return `₹${unitCost.toFixed(3)} / ${unit}`;
  } else {
    return `₹${unitCost.toFixed(4)} / ${unit}`;
  }
}

export function formatCaloriesPerUnit(
  calories: number | string | null | undefined,
  unit: string = ''
): string {
  const cal = typeof calories === 'number' ? calories : parseFloat(String(calories ?? 0));
  const cleanUnit = unit.toLowerCase().trim();
  const isPcs = cleanUnit === 'pcs' || cleanUnit === 'pc' || cleanUnit === 'piece' || cleanUnit === 'pieces' || cleanUnit === 'crate' || cleanUnit === 'dozen';
  const unitLabel = isPcs ? 'pc' : unit;

  if (isNaN(cal) || cal === 0) return `0 kcal${unitLabel ? ` / ${unitLabel}` : ''}`;
  return `${Number(cal.toFixed(2))} kcal${unitLabel ? ` / ${unitLabel}` : ''}`;
}
