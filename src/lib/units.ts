/**
 * Kora – Unit Engine
 *
 * Canonical base units: 'g' | 'ml' | 'pcs'
 * All DB quantities are stored in canonical base units.
 * This module handles:
 *   - toBaseUnit: convert any user-input unit → canonical base
 *   - convertRecipeQuantityToIngredientBase: scale recipe qty → ingredient's canonical unit
 *   - getDynamicUnitLabels: form label helpers for Indian grocery formats
 *   - formatINR: ₹ currency formatting
 */

export type CanonicalUnit = 'g' | 'ml' | 'pcs';

export interface UnitConversion {
  baseUnit: CanonicalUnit;
  multiplier: number;
}

// =============================================================
// 1. Conversion table: input unit → canonical base
// =============================================================

export const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Weight → grams
  g:         { baseUnit: 'g',   multiplier: 1 },
  gram:      { baseUnit: 'g',   multiplier: 1 },
  grams:     { baseUnit: 'g',   multiplier: 1 },
  kg:        { baseUnit: 'g',   multiplier: 1000 },
  kilogram:  { baseUnit: 'g',   multiplier: 1000 },
  kilograms: { baseUnit: 'g',   multiplier: 1000 },

  // Volume → milliliters
  ml:          { baseUnit: 'ml', multiplier: 1 },
  milliliter:  { baseUnit: 'ml', multiplier: 1 },
  millilitre:  { baseUnit: 'ml', multiplier: 1 },
  l:           { baseUnit: 'ml', multiplier: 1000 },
  L:           { baseUnit: 'ml', multiplier: 1000 },
  liter:       { baseUnit: 'ml', multiplier: 1000 },
  litre:       { baseUnit: 'ml', multiplier: 1000 },
  liters:      { baseUnit: 'ml', multiplier: 1000 },
  litres:      { baseUnit: 'ml', multiplier: 1000 },
  tbsp:        { baseUnit: 'ml', multiplier: 15 },
  tablespoon:  { baseUnit: 'ml', multiplier: 15 },
  tablespoons: { baseUnit: 'ml', multiplier: 15 },
  tsp:         { baseUnit: 'ml', multiplier: 5 },
  teaspoon:    { baseUnit: 'ml', multiplier: 5 },
  teaspoons:   { baseUnit: 'ml', multiplier: 5 },
  cup:         { baseUnit: 'ml', multiplier: 240 },
  cups:        { baseUnit: 'ml', multiplier: 240 },

  // Count → pieces
  pcs:    { baseUnit: 'pcs', multiplier: 1 },
  pc:     { baseUnit: 'pcs', multiplier: 1 },
  piece:  { baseUnit: 'pcs', multiplier: 1 },
  pieces: { baseUnit: 'pcs', multiplier: 1 },
  egg:    { baseUnit: 'pcs', multiplier: 1 },
  eggs:   { baseUnit: 'pcs', multiplier: 1 },
  crate:  { baseUnit: 'pcs', multiplier: 30 }, // 30-egg crate
  dozen:  { baseUnit: 'pcs', multiplier: 12 },
  bunch:  { baseUnit: 'g',   multiplier: 50 }, // approx bunch of greens/herbs
};

// =============================================================
// 2. toBaseUnit: convert any quantity + unit → canonical base
// =============================================================

/**
 * Convert an input quantity and unit to canonical base unit quantity.
 * Returns { value, unit } in canonical base.
 *
 * @example toBaseUnit(1, 'kg') → { value: 1000, unit: 'g' }
 * @example toBaseUnit(500, 'ml') → { value: 500, unit: 'ml' }
 * @example toBaseUnit(1, 'crate') → { value: 30, unit: 'pcs' }
 * @example toBaseUnit(2, 'tbsp') → { value: 30, unit: 'ml' }
 */
export function toBaseUnit(
  quantity: number,
  inputUnit: string,
): { value: number; unit: CanonicalUnit } {
  const key = inputUnit.trim().toLowerCase();
  const conv = UNIT_CONVERSIONS[key] ?? UNIT_CONVERSIONS[inputUnit.trim()];

  if (!conv) {
    // Unknown unit: treat as already canonical if it matches, else default to g
    const canonical = (['g', 'ml', 'pcs'] as const).find(
      (u) => u === inputUnit.trim(),
    );
    if (canonical) return { value: quantity, unit: canonical };
    throw new Error(`Unknown unit: "${inputUnit}". Cannot convert to canonical base.`);
  }

  return {
    value: parseFloat((quantity * conv.multiplier).toFixed(6)),
    unit: conv.baseUnit,
  };
}

// =============================================================
// 3. pcs ↔ g conversion via weight_per_unit_g
// =============================================================

/**
 * Convert piece count to grams using the ingredient's weight_per_unit_g.
 * @example pcsToGrams(2, 50) → 100  (2 eggs × 50g each)
 */
export function pcsToGrams(pcs: number, weightPerUnitG: number): number {
  return parseFloat((pcs * weightPerUnitG).toFixed(6));
}

/**
 * Convert grams to piece count using the ingredient's weight_per_unit_g.
 * @example gramsToPcs(100, 50) → 2  (100g ÷ 50g per egg)
 */
export function gramsToPcs(grams: number, weightPerUnitG: number): number {
  if (weightPerUnitG <= 0) throw new Error('weight_per_unit_g must be > 0');
  return parseFloat((grams / weightPerUnitG).toFixed(6));
}

// =============================================================
// 4. convertRecipeQuantityToIngredientBase
// =============================================================

/**
 * Convert a recipe ingredient quantity (in the ingredient's own canonical unit)
 * into the scaled quantity consumed, optionally converting pcs↔g when
 * weight_per_unit_g is available.
 */
export function convertRecipeQuantityToIngredientBase(
  quantityUsed: number,
  servings: number,
  ingredientUnit: CanonicalUnit,
  targetUnit: CanonicalUnit = ingredientUnit,
  weightPerUnitG?: number | null,
): number {
  const scaled = quantityUsed * servings;

  if (ingredientUnit === targetUnit) return parseFloat(scaled.toFixed(6));

  // pcs → g
  if (ingredientUnit === 'pcs' && targetUnit === 'g') {
    if (!weightPerUnitG || weightPerUnitG <= 0) {
      throw new Error('weight_per_unit_g required for pcs→g conversion');
    }
    return pcsToGrams(scaled, weightPerUnitG);
  }

  // g → pcs
  if (ingredientUnit === 'g' && targetUnit === 'pcs') {
    if (!weightPerUnitG || weightPerUnitG <= 0) {
      throw new Error('weight_per_unit_g required for g→pcs conversion');
    }
    return gramsToPcs(scaled, weightPerUnitG);
  }

  throw new Error(
    `Cannot convert between ${ingredientUnit} and ${targetUnit} without a weight_per_unit_g factor.`,
  );
}

// =============================================================
// 5. getDynamicUnitLabels
// =============================================================

export interface UnitOption {
  value: string;
  label: string;
  baseUnit: CanonicalUnit;
  multiplier: number;
}

export const INDIAN_UNIT_OPTIONS: UnitOption[] = [
  // Weight
  { value: 'g',     label: 'g (grams)',               baseUnit: 'g',   multiplier: 1 },
  { value: 'kg',    label: 'kg (kilograms → 1000g)',  baseUnit: 'g',   multiplier: 1000 },
  // Volume
  { value: 'ml',    label: 'ml (milliliters)',         baseUnit: 'ml',  multiplier: 1 },
  { value: 'L',     label: 'L (liters → 1000ml)',      baseUnit: 'ml',  multiplier: 1000 },
  { value: 'tbsp',  label: 'tbsp (tablespoon → 15ml)', baseUnit: 'ml',  multiplier: 15 },
  { value: 'tsp',   label: 'tsp (teaspoon → 5ml)',     baseUnit: 'ml',  multiplier: 5 },
  // Count
  { value: 'pcs',   label: 'pcs (pieces/units)',       baseUnit: 'pcs', multiplier: 1 },
  { value: 'crate', label: 'crate (30 eggs → 30pcs)',  baseUnit: 'pcs', multiplier: 30 },
  { value: 'dozen', label: 'dozen (12 pcs)',            baseUnit: 'pcs', multiplier: 12 },
];

export function getDynamicPackSizeLabel(inputUnit: string): string {
  const opt = INDIAN_UNIT_OPTIONS.find((o) => o.value === inputUnit);
  if (!opt) return `Pack Size (${inputUnit})`;
  if (opt.multiplier === 1) return `Pack Size (${opt.value})`;
  const baseQty = new Intl.NumberFormat('en-IN').format(opt.multiplier);
  return `Pack Size (${opt.value}) – converts to ${baseQty}${opt.baseUnit} in DB`;
}

export function getUnitCostPreview(
  packSizeInBase: number,
  baseUnit: CanonicalUnit,
  packCost: number,
): string {
  if (packSizeInBase <= 0) return '';
  const costPerBase = packCost / packSizeInBase;
  if (baseUnit === 'g') return `${formatINR(costPerBase * 100)} / 100g`;
  if (baseUnit === 'ml') return `${formatINR(costPerBase * 100)} / 100ml`;
  return `${formatINR(costPerBase)} / piece`;
}

// =============================================================
// 6. formatINR — ₹ currency formatter
// =============================================================

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}
