---
name: kora-indian-units
description: >-
  Standard operating procedures for Indian grocery packaging formats, unit
  normalization to canonical base units (g, ml, pcs), piece-to-gram conversion,
  dynamic form labels, and INR (₹) currency formatting.
---

# Kora Indian Grocery Formats & Unit Engine Skill

This skill details how to handle Indian grocery packaging formats, unit conversions, pantry inventory tracking, and recipe ingredient calculations in Kora.

---

## 1. Indian Grocery Packaging Formats

Unlike Western grocery systems that assume ounce/pound or pre-packaged single servings, Indian kitchens procure staples and produce in distinctive packaging and bulk configurations:

| Category | Typical Indian Packaging Formats | Purchase Unit | Canonical Base Unit |
| :--- | :--- | :--- | :--- |
| **Eggs** | 30-egg crate ("tray"), 6 or 12-egg carton | `crate` (30 pcs) or `pcs` | `pcs` |
| **Milk & Buttermilk** | 500ml pouch, 1L pouch (Aashirvaad / Amul / Nandini) | `pouch` (500ml/1L) or `L` | `ml` |
| **Cooking Oils & Ghee** | 800ml / 910g / 1L pouch, 5L tin, 500ml jar | `pouch`, `L`, `g` | `ml` or `g` |
| **Dals, Lentils & Pulses** | 500g, 1kg, 2kg, 5kg bags (Toor, Moong, Urad, Chana) | `kg` or `g` | `g` |
| **Rice & Atta** | 1kg, 5kg, 10kg, 25kg sacks | `kg` | `g` |
| **Whole & Ground Spices** | 50g, 100g, 200g, 500g packs (MDH, Everest, Catch) | `g` | `g` |
| **Vegetables (Bulb / Root)**| 1kg, 2kg, 5kg mandi bags (onions, potatoes) | `kg` or `pcs` | `g` (or `pcs` with conversion) |
| **Produce (Counted Items)** | Per piece (lemon, coconut, avocado, cucumber) | `pcs` | `pcs` |
| **Fresh Greens & Herbs** | Bunch / Jodi / Kattu (coriander, methi, palak, curry leaves) | `bunch` or `g` | `g` |

---

## 2. Canonical Unit Normalization

The database strictly accepts three canonical base units to maintain analytical precision:
1. **Weight**: `g` (grams)
2. **Volume**: `ml` (milliliters)
3. **Count**: `pcs` (pieces)

### Normalization Conversion Table

```ts
export const UNIT_CONVERSIONS: Record<string, { baseUnit: 'g' | 'ml' | 'pcs'; multiplier: number }> = {
  // Weight -> grams
  g: { baseUnit: 'g', multiplier: 1 },
  gram: { baseUnit: 'g', multiplier: 1 },
  grams: { baseUnit: 'g', multiplier: 1 },
  kg: { baseUnit: 'g', multiplier: 1000 },
  kilogram: { baseUnit: 'g', multiplier: 1000 },

  // Volume -> milliliters
  ml: { baseUnit: 'ml', multiplier: 1 },
  l: { baseUnit: 'ml', multiplier: 1000 },
  liter: { baseUnit: 'ml', multiplier: 1000 },
  litre: { baseUnit: 'ml', multiplier: 1000 },
  tbsp: { baseUnit: 'ml', multiplier: 15 },
  tablespoon: { baseUnit: 'ml', multiplier: 15 },
  tsp: { baseUnit: 'ml', multiplier: 5 },
  teaspoon: { baseUnit: 'ml', multiplier: 5 },
  cup: { baseUnit: 'ml', multiplier: 240 },

  // Count -> pieces
  pcs: { baseUnit: 'pcs', multiplier: 1 },
  pc: { baseUnit: 'pcs', multiplier: 1 },
  piece: { baseUnit: 'pcs', multiplier: 1 },
  pieces: { baseUnit: 'pcs', multiplier: 1 },
  egg: { baseUnit: 'pcs', multiplier: 1 },
  crate: { baseUnit: 'pcs', multiplier: 30 },
  dozen: { baseUnit: 'pcs', multiplier: 12 },
};
```

---

## 3. Piece (`pcs`) <-> Grams (`g`) Conversion via `weight_per_unit_g`

When an ingredient is bought by weight (e.g. 1kg of onions) but cooked by count (e.g. "chop 2 onions"), or vice versa (e.g. bought 30 eggs, calorie tracking by weight):

- The `ingredients` table includes an optional column: `weight_per_unit_g numeric`.
- **Reference Table for Common Indian Kitchen Items**:
  - **Egg**: `50g`
  - **Medium Onion (Pyaaz)**: `80g`
  - **Medium Tomato (Tamatar)**: `90g`
  - **Medium Potato (Aloo)**: `120g`
  - **Lemon (Nimbu)**: `40g`
  - **Green Chilli (Hari Mirch)**: `5g`
  - **Garlic Clove (Lehsun)**: `4g`
  - **Medium Banana**: `100g`

### Bidirectional Conversion Formulas

1. **Given count in pieces, find total weight in grams**:
   $$\text{total\_grams} = \text{quantity\_pcs} \times \text{weight\_per\_unit\_g}$$
2. **Given total weight in grams, find count in pieces**:
   $$\text{quantity\_pcs} = \frac{\text{total\_grams}}{\text{weight\_per\_unit\_g}}$$

---

## 4. Dynamic Form Labels & Real-Time Unit Economics

When entering raw ingredients or adding them to recipes:
1. **Dynamic Form Labels**:
   - If the user selects `kg`, the pack size input shows: `Pack Size (kg) - converts to 1,000g in DB`.
   - If the user selects `30-egg crate`, pack size defaults to `30 pcs`.
2. **Unit Cost Preview**:
   - Always display normalized unit rates:
     - For grams: `₹X.XX / 100g` (e.g. `₹24.00 / 100g`)
     - For milliliters: `₹X.XX / 100ml` (e.g. `₹18.50 / 100ml`)
     - For pieces: `₹X.XX / piece` (e.g. `₹6.50 / egg`)

---

## 5. Currency Formatting Standards

- Standard helper:
  ```ts
  export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  }
  ```
- Result format: `₹1,450.00`, `₹45.50`, `₹6.00`.
