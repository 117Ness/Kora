# Kora Project Rules & Architectural Standards

These rules define the non-negotiable architectural, design, and code quality standards for the **Kora** codebase. All agents and contributors must follow these directives strictly.

---

## 1. Single App Router Root Enforcement

- **Sole Root Directory**: All pages, layouts, templates, and routes must reside strictly inside `src/app/`.
- **Never Recreate Root `app/`**: Do NOT create a top-level `app/` directory under the project root. Having both `app/` and `src/app/` breaks Next.js route resolution.
- **Directory Structure Standards**:
  - `src/app/`: App Router route tree (`/`, `/library`, `/insights`, error/loading boundaries).
  - `src/app/actions/`: Next.js Server Actions for mutations and data operations.
  - `src/components/`: Reusable React components categorized by domain (`planner/`, `library/`, `insights/`, etc.).
  - `src/lib/`: Reusable libraries, Supabase clients, unit engines, and analytics.
  - `src/types/`: Centralized TypeScript domain types and schemas.
  - `supabase/`: Database schemas, SQL migrations, and seed scripts.

---

## 2. Next.js 16 `cacheComponents` Compatibility

Kora runs on Next.js 16 with `@tailwindcss/turbopack`, `cacheComponents: true`, and Partial Prerendering enabled in `next.config.ts`. To ensure clean prerendering and zero SSR bailouts:

1. **Wrap Dynamic Data Calls in `<Suspense>`**:
   - Any Server Component invoking dynamic Supabase queries or server actions (e.g. `getPlannerData()`, `getLibraryData()`, `getInsightsData()`) must be wrapped in a `<Suspense fallback={<LoadingSkeleton />}>` boundary.
   - Do NOT perform top-level un-suspended async database fetches in root layouts.
2. **Avoid `new Date()` in Server Component Layouts During Prerender**:
   - Do NOT evaluate `new Date()` or nondeterministic timestamps inside Server Component layouts during static prerender generation.
   - For client-relative dates (e.g., current day of week or current month selection), initialize them inside Client Components (`'use client'`) or pass them through Suspense-boundary data loaders.
3. **No Legacy Segment Config Exports**:
   - Never use legacy `export const revalidate = ...` or `export const dynamic = ...` route segment configuration exports.
   - Dynamic request boundaries in Next.js 16 must use the Next.js cache and `connection()` primitives.

---

## 3. Warm Editorial Cookbook Design System

Kora features a warm, physical-cookbook aesthetic inspired by parchment paper, oatmeal card surfaces, and delicate olive line-art:

### Color Palette Tokens
- **Parchment Background (Canvas)**: `#F3EDE0`
- **Oatmeal Card Surfaces**: `#EBE3D2`
- **Cream / Warm Paper Highlights & Inputs**: `#F7F2E7`
- **Hairline Olive Borders**: `#C8BFA8` (crisp 1px borders)
- **Deep Olive-Charcoal Ink (Primary Text)**: `#3E3C32`
- **Muted Taupe-Olive (Secondary Text & Captions)**: `#7D7765`
- **Solid Olive-Taupe (Primary Buttons & Active Pills)**: `#7A7463` with `#F7F2E7` text (hover: `#696353`)

### Typography Hierarchy
- **Headings & KPI Figures**: **Playfair Display** editorial serif (`font-serif`, `var(--font-playfair)`). Applied to all `h1`-`h6`, brand logo wordmarks, `.recipe-title`, and `.kpi-figure`.
- **UI, Metadata, Units & Forms**: **Plus Jakarta Sans** clean sans-serif (`font-sans`, `var(--font-sans)`). Applied to form controls, inputs, units, tables, and secondary captions.

### Currency Formatting (₹ INR Everywhere)
- **Strictly Indian Rupee (`₹`)**: Format every currency value, grocery price, daily burn rate, and projected monthly cost in Indian Rupees (`₹`), formatted with `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Never use `$` or other non-INR currency symbols anywhere in the interface or calculations.

### UI Accents & Layout Elements
- **Pill Controls**: Search inputs, filter bars, view-mode switchers, and active tabs must use rounded pill shapes (`rounded-full`).
- **Floating Button**: The primary action button on the Planner is a solid olive-taupe (`#7A7463`) pill button fixed at `bottom-6 right-6`.
- **Fine-Line Botanical / Culinary Accents**: Use lightweight custom SVG accents (`OliveSprigSvg`, `HerbSprigSvg`) with `strokeWidth="1.25"` on recipe cards and section dividers.
- **Earthy Recharts Palette**: Chart strokes and fills must strictly use Kora's earthy palette:
  - **Sage**: `#6B7F5E`
  - **Terracotta**: `#B86B4B`
  - **Ochre**: `#C49A45`
  - **Olive**: `#7A7463`

---

## 4. Canonical Database Base Units & Zod v4 Conventions

### Canonical Base Units in Database
To guarantee mathematically sound unit economics, inventory depletion, and caloric computation, the database stores quantities strictly normalized to one of three canonical base units:
- **Weight**: `g` (grams)
- **Volume**: `ml` (milliliters)
- **Count**: `pcs` (pieces / units)

- Grocery purchase inputs (e.g., `kg`, `L`, `tbsp`, `tsp`) must be normalized to canonical base units before persisting to Supabase.
- Where an item is bought in bulk weight but consumed by piece (or vice-versa), optional `weight_per_unit_g` (grams per piece) enables bidirectional conversion.

### Zod v4 Conventions
- Kora uses **Zod v4** (`zod@^4.x`).
- Access validation issues strictly via `.issues` (e.g. `result.error.issues`), NEVER using deprecated `.errors`.
- Schemas must adhere to Zod v4 schema definition semantics.
