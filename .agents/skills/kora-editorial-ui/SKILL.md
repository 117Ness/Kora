---
name: kora-editorial-ui
description: >-
  Design system guidelines and implementation rules for Kora's warm editorial
  cookbook UI, hairline oatmeal cards, pill inputs, botanical SVG accents, and earthy Recharts palette.
---

# Kora Editorial Cookbook UI Skill

This skill guides the implementation, styling, and design patterns for Kora's user interface. Use this skill whenever building or restyling components, forms, cards, navigation, or data visualizations.

---

## Core Aesthetic & Philosophy

Kora presents a tactile, editorial cookbook experience inspired by heirloom culinary journals, warm French parchment, and delicate olive line-art illustrations. Interfaces should feel warm, deliberate, and readable rather than sterile or high-contrast tech-dark.

---

## Color System

Always use Kora's semantic tokens or Tailwind theme classes:

| Role | Color Name | Hex Code | Tailwind / CSS Variable |
| :--- | :--- | :--- | :--- |
| **Canvas** | Warm Parchment | `#F3EDE0` | `bg-[#F3EDE0]`, `--background`, `--color-parchment` |
| **Card Surfaces** | Oatmeal | `#EBE3D2` | `bg-[#EBE3D2]`, `--surface`, `--color-oatmeal` |
| **Input / Paper** | Cream Paper | `#F7F2E7` | `bg-[#F7F2E7]`, `--surface-paper`, `--color-warm-paper` |
| **Borders & Dividers**| Hairline Olive | `#C8BFA8` | `border-[#C8BFA8]`, `--border`, `--color-hairline` |
| **Primary Ink** | Deep Olive-Charcoal | `#3E3C32` | `text-[#3E3C32]`, `--foreground`, `--color-olive-charcoal` |
| **Secondary Text** | Muted Taupe-Olive | `#7D7765` | `text-[#7D7765]`, `--muted`, `--color-taupe-olive` |
| **Primary Buttons** | Solid Olive-Taupe | `#7A7463` | `bg-[#7A7463] text-[#F7F2E7]`, `--primary` |
| **Primary Hover** | Deepened Olive | `#696353` | `hover:bg-[#696353]`, `--primary-hover` |

---

## Typography Guidelines

1. **Playfair Display (Editorial Serif)**:
   - Use via `font-serif` / `var(--font-playfair)`.
   - Applied to:
     - Main headings (`h1`, `h2`, `h3`, `h4`, `h5`, `h6`)
     - Brand logo wordmark ("Kora")
     - Recipe titles (`.recipe-title`)
     - Large KPI summary numbers (`.kpi-figure`)
   - Style with tight letter spacing: `tracking-tight` or `tracking-[-0.02em]`.

2. **Plus Jakarta Sans (Clean Modern Sans)**:
   - Use via `font-sans` / `var(--font-sans)`.
   - Applied to:
     - Form labels, text inputs, selects, and textareas
     - Unit badges (`g`, `ml`, `pcs`, `₹`)
     - Data tables, metadata timestamps, and descriptions
     - Button action labels and tooltips

---

## Component Design Patterns

### 1. Hairline Cards
- Cards must use oatmeal surfaces with 1px hairline borders:
  ```tsx
  <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-5 shadow-xs transition-all hover:border-[#7A7463]/70 hover:shadow-sm">
    ...
  </div>
  ```

### 2. Pill Search & Filter Inputs
- Inputs must use pill geometry with warm paper surfaces:
  ```tsx
  <div className="relative w-full sm:w-80">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
    <input
      type="text"
      placeholder="Search recipes or ingredients..."
      className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-10 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs"
    />
  </div>
  ```

### 3. Navigation Shell & Active Pills
- Active navigation tabs and filter buttons use solid olive-taupe pills:
  ```tsx
  className={active
    ? "rounded-full bg-[#7A7463] text-[#F7F2E7] px-4 py-1.5 text-xs font-semibold shadow-xs"
    : "rounded-full text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] px-4 py-1.5 text-xs font-medium"
  }
  ```

### 4. Floating Action Button
- Fixed floating button at `bottom-6 right-6`:
  ```tsx
  <button
    type="button"
    className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-xl border border-[#C8BFA8] transition-transform duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#7A7463]"
  >
    <Plus className="h-6 w-6 stroke-[2.2] transition-transform group-hover:rotate-90 duration-300" />
  </button>
  ```

### 5. Botanical Line-Art SVG Accents
- Import lightweight botanical accents from `@/components/BotanicalAccents`:
  ```tsx
  import { OliveSprigSvg, HerbSprigSvg, BotanicalFlourishSvg } from '@/components/BotanicalAccents';
  
  // Example subtle card background emblem
  <div className="absolute right-4 top-4 opacity-25 group-hover:opacity-60 transition-opacity pointer-events-none">
    <HerbSprigSvg className="h-5 w-5 text-[#7A7463]" />
  </div>
  ```

### 6. Earthy Recharts Palette for Analytics
- Chart strokes, lines, and bars must use Kora's 4-color earthy palette:
  - **Sage (`#6B7F5E`)**: Produce, healthy adherence, and projected benchmarks.
  - **Terracotta (`#B86B4B`)**: Caloric intake, daily burn velocity, and alert thresholds.
  - **Ochre (`#C49A45`)**: Pantry staples, bulk inventory, and daily volume bars.
  - **Olive (`#7A7463`)**: Cumulative actual spend and primary trendlines.
- Chart gridlines must use hairline opacity: `<CartesianGrid strokeDasharray="3 3" stroke="#C8BFA8" opacity={0.6} />`.
- Tooltips must render inside warm parchment cards: `bg-[#F3EDE0] border border-[#C8BFA8] text-[#3E3C32] rounded-2xl p-3.5 shadow-xl`.

### 7. Universal INR (₹) Currency Display
- Always format currency values with `formatCurrency()`:
  ```ts
  export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  }
  ```
- Axis tick formatters: `tickFormatter={(val) => `₹${val}`}`.
- Form inputs: `Pack Cost (₹)`.
