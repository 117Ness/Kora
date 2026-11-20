'use client';

import { useState, useCallback } from 'react';
import {
  BookOpen,
  Layers,
  Columns2,
  ChevronRight,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import type { RecipeWithIngredients, Ingredient } from '@/types/kora';
import { getLibraryData } from '@/app/actions/kora';
import { RecipeTabView } from './RecipeTabView';
import { IngredientsTabView } from './IngredientsTabView';
import { formatCurrency } from './utils';

type AccordionMode = 'recipe' | 'ingredients' | 'both';

interface LibraryAccordionsProps {
  initialRecipes: RecipeWithIngredients[];
  initialIngredients: Ingredient[];
}

export function LibraryAccordions({
  initialRecipes,
  initialIngredients,
}: LibraryAccordionsProps) {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>(initialRecipes);
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [activeMode, setActiveMode] = useState<AccordionMode>('recipe');

  // Mobile individual collapse toggles
  const [isMobileRecipeOpen, setIsMobileRecipeOpen] = useState(true);
  const [isMobileIngredientsOpen, setIsMobileIngredientsOpen] = useState(false);

  const refreshData = useCallback(async () => {
    const res = await getLibraryData();
    if (res.success) {
      setRecipes(res.data.recipes);
      setIngredients(res.data.ingredients);
    }
  }, []);

  // Quick stats
  const totalPantryValue = ingredients.reduce(
    (sum, ing) => sum + (Number(ing.pack_cost) || 0),
    0
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top Hero / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpen className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Recipe &amp; Pantry Library
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Manage your kitchen collection, calibrate ingredient pack sizes and costs,
            and monitor macro nutritional intelligence across all recipes.
          </p>
        </div>

        {/* View mode switcher pills */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveMode('recipe');
              setIsMobileRecipeOpen(true);
              setIsMobileIngredientsOpen(false);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeMode === 'recipe'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Recipes</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeMode === 'recipe'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {recipes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('ingredients');
              setIsMobileRecipeOpen(false);
              setIsMobileIngredientsOpen(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeMode === 'ingredients'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Ingredients</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeMode === 'ingredients'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {ingredients.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('both');
              setIsMobileRecipeOpen(true);
              setIsMobileIngredientsOpen(true);
            }}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeMode === 'both'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
            title="View both menus side-by-side"
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Side-by-Side</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Recipes
            </span>
            <span className="text-base font-bold text-slate-100">
              {recipes.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Pantry Catalog
            </span>
            <span className="text-base font-bold text-slate-100">
              {ingredients.length} items
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Pantry Pack Inventory
            </span>
            <span className="text-base font-bold text-slate-100">
              {formatCurrency(totalPantryValue)}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP LAYOUT (Horizontal Accordion Side-by-Side: lg+) */}
      {/* ============================================================== */}
      <div className="hidden lg:flex gap-4 items-stretch min-h-[600px] transition-all duration-300">
        {/* PANEL 1: RECIPES */}
        {activeMode === 'ingredients' ? (
          /* Collapsed Recipe Accordion Pillar */
          <button
            type="button"
            onClick={() => setActiveMode('recipe')}
            className="group flex flex-col items-center justify-between w-16 rounded-3xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-emerald-500/50 p-4 transition-all duration-300 cursor-pointer shadow-lg shadow-slate-950/40"
            title="Expand Recipes menu"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 border border-slate-700 transition-colors">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {recipes.length}
              </span>
            </div>

            <div className="my-auto py-8">
              <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-bold tracking-widest uppercase text-slate-400 group-hover:text-emerald-300 transition-colors">
                Recipe Catalog
              </span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ) : (
          /* Expanded Recipe Panel */
          <div
            className={`flex-1 rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 p-6 shadow-xl shadow-slate-950/60 transition-all duration-300 ${
              activeMode === 'both' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Panel Top Title */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Recipe Catalog
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Formulated dishes with ingredient breakdown and cost/calorie totals
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
              </span>
            </div>

            {/* Recipe Content */}
            <RecipeTabView
              recipes={recipes}
              onDataChange={refreshData}
            />
          </div>
        )}

        {/* PANEL 2: INGREDIENTS */}
        {activeMode === 'recipe' ? (
          /* Collapsed Ingredients Accordion Pillar */
          <button
            type="button"
            onClick={() => setActiveMode('ingredients')}
            className="group flex flex-col items-center justify-between w-16 rounded-3xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-emerald-500/50 p-4 transition-all duration-300 cursor-pointer shadow-lg shadow-slate-950/40"
            title="Expand Ingredients menu"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 border border-slate-700 transition-colors">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {ingredients.length}
              </span>
            </div>

            <div className="my-auto py-8">
              <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-bold tracking-widest uppercase text-slate-400 group-hover:text-emerald-300 transition-colors">
                Pantry Ingredients
              </span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
              <ChevronRight className="h-4 w-4" />
            </div>
          </button>
        ) : (
          /* Expanded Ingredients Panel */
          <div
            className={`flex-1 rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-950/90 p-6 shadow-xl shadow-slate-950/60 transition-all duration-300 ${
              activeMode === 'both' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Panel Top Title */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Pantry &amp; Raw Ingredients
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Packaging sizes, bulk purchase costs, unit rates, and caloric values
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {ingredients.length} {ingredients.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Ingredients Content */}
            <IngredientsTabView
              ingredients={ingredients}
              onDataChange={refreshData}
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MOBILE / NARROW SCREEN LAYOUT (Responsive Stack Accordions) */}
      {/* ============================================================== */}
      <div className="lg:hidden space-y-4">
        {/* Accordion 1: Recipes */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg shadow-slate-950/40">
          <button
            type="button"
            onClick={() => setIsMobileRecipeOpen(!isMobileRecipeOpen)}
            className="w-full flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800/80 text-left transition-colors hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Recipes</h3>
                <span className="text-[11px] text-slate-400">
                  {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'} in library
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {recipes.length}
              </span>
              {isMobileRecipeOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </button>

          {isMobileRecipeOpen && (
            <div className="p-4">
              <RecipeTabView
                recipes={recipes}
                onDataChange={refreshData}
              />
            </div>
          )}
        </div>

        {/* Accordion 2: Ingredients */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg shadow-slate-950/40">
          <button
            type="button"
            onClick={() => setIsMobileIngredientsOpen(!isMobileIngredientsOpen)}
            className="w-full flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800/80 text-left transition-colors hover:bg-slate-850"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ingredients</h3>
                <span className="text-[11px] text-slate-400">
                  {ingredients.length} {ingredients.length === 1 ? 'item' : 'items'} in pantry
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {ingredients.length}
              </span>
              {isMobileIngredientsOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </button>

          {isMobileIngredientsOpen && (
            <div className="p-4">
              <IngredientsTabView
                ingredients={ingredients}
                onDataChange={refreshData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibraryAccordions;
