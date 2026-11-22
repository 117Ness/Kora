'use client';

import { useState, useCallback } from 'react';
import {
  BookOpen,
  Layers,
  Columns2,
  ChevronRight,
  ChevronDown,
  IndianRupee,
} from 'lucide-react';
import type { RecipeWithIngredients, Ingredient } from '@/types/kora';
import { getLibraryData } from '@/app/actions/kora';
import { RecipeTabView } from './RecipeTabView';
import { IngredientsTabView } from './IngredientsTabView';
import { formatCurrency } from './utils';
import { OliveSprigSvg } from '@/components/BotanicalAccents';

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
    <div className="space-y-6 pb-24">
      {/* Top Hero / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C8BFA8] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <BookOpen className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#3E3C32] sm:text-3xl">
              Recipe &amp; Pantry Library
            </h1>
            <OliveSprigSvg className="h-5 w-5 text-[#7A7463] hidden sm:block opacity-75" />
          </div>
          <p className="text-xs sm:text-sm text-[#7D7765] mt-1.5 max-w-2xl font-sans">
            Manage your kitchen collection, calibrate ingredient pack sizes and costs,
            and monitor macro nutritional intelligence across all recipes.
          </p>
        </div>

        {/* View mode switcher pills */}
        <div className="flex items-center gap-1.5 rounded-full bg-[#EBE3D2] p-1 border border-[#C8BFA8] shadow-xs">
          <button
            type="button"
            onClick={() => {
              setActiveMode('recipe');
              setIsMobileRecipeOpen(true);
              setIsMobileIngredientsOpen(false);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeMode === 'recipe'
                ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                : 'text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#F3EDE0]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Recipes</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeMode === 'recipe'
                  ? 'bg-[#F7F2E7]/20 text-[#F7F2E7]'
                  : 'bg-[#F7F2E7] text-[#3E3C32] border border-[#C8BFA8]'
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
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeMode === 'ingredients'
                ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                : 'text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#F3EDE0]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Ingredients</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeMode === 'ingredients'
                  ? 'bg-[#F7F2E7]/20 text-[#F7F2E7]'
                  : 'bg-[#F7F2E7] text-[#3E3C32] border border-[#C8BFA8]'
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
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              activeMode === 'both'
                ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
                : 'text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#F3EDE0]'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Split View</span>
          </button>
        </div>
      </div>

      {/* Quick Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] p-3.5 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8]">
            <BookOpen className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
              Total Recipes
            </span>
            <span className="font-serif text-base font-bold text-[#3E3C32]">
              {recipes.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] p-3.5 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#6B7F5E] border border-[#C8BFA8]">
            <Layers className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
              Pantry Catalog
            </span>
            <span className="font-serif text-base font-bold text-[#3E3C32]">
              {ingredients.length} items
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] p-3.5 shadow-xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#C49A45] border border-[#C8BFA8]">
            <IndianRupee className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#7D7765] font-sans">
              Pantry Pack Inventory
            </span>
            <span className="font-serif text-base font-bold text-[#3E3C32]">
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
            className="group flex flex-col items-center justify-between w-16 rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] hover:bg-[#E4DCCB] p-4 transition-all duration-300 cursor-pointer shadow-xs"
            title="Expand Recipes menu"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8] transition-colors">
                <BookOpen className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-[#3E3C32] px-2 py-0.5 rounded-full bg-[#F7F2E7] border border-[#C8BFA8]">
                {recipes.length}
              </span>
            </div>

            <div className="my-auto py-8">
              <span className="[writing-mode:vertical-rl] rotate-180 font-serif text-xs font-bold tracking-widest uppercase text-[#7D7765] group-hover:text-[#3E3C32] transition-colors">
                Recipe Catalog
              </span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8] transition-colors">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </button>
        ) : (
          /* Expanded Recipe Panel */
          <div
            className={`flex-1 rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] p-6 shadow-xs transition-all duration-300 ${
              activeMode === 'both' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Panel Top Title */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#C8BFA8]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8]">
                  <BookOpen className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-[#3E3C32] tracking-tight">
                    Recipe Catalog
                  </h2>
                  <p className="text-[11px] text-[#7D7765] font-sans">
                    Formulated dishes with ingredient breakdown and cost/calorie totals
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EBE3D2] text-[#7D7765] border border-[#C8BFA8]">
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
            className="group flex flex-col items-center justify-between w-16 rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] hover:bg-[#E4DCCB] p-4 transition-all duration-300 cursor-pointer shadow-xs"
            title="Expand Ingredients menu"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#6B7F5E] border border-[#C8BFA8] transition-colors">
                <Layers className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-bold text-[#3E3C32] px-2 py-0.5 rounded-full bg-[#F7F2E7] border border-[#C8BFA8]">
                {ingredients.length}
              </span>
            </div>

            <div className="my-auto py-8">
              <span className="[writing-mode:vertical-rl] rotate-180 font-serif text-xs font-bold tracking-widest uppercase text-[#7D7765] group-hover:text-[#3E3C32] transition-colors">
                Pantry Ingredients
              </span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8] transition-colors">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </button>
        ) : (
          /* Expanded Ingredients Panel */
          <div
            className={`flex-1 rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] p-6 shadow-xs transition-all duration-300 ${
              activeMode === 'both' ? 'w-1/2' : 'w-full'
            }`}
          >
            {/* Panel Top Title */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#C8BFA8]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#6B7F5E] border border-[#C8BFA8]">
                  <Layers className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-[#3E3C32] tracking-tight">
                    Pantry &amp; Raw Ingredients
                  </h2>
                  <p className="text-[11px] text-[#7D7765] font-sans">
                    Packaging sizes, bulk purchase costs, unit rates, and caloric values
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EBE3D2] text-[#7D7765] border border-[#C8BFA8]">
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
      {/* MOBILE ACCORDIONS (Stacked Collapsible: < lg) */}
      {/* ============================================================== */}
      <div className="lg:hidden space-y-4">
        {/* Accordion 1: Recipes */}
        <div className="rounded-2xl border border-[#C8BFA8] bg-[#F3EDE0] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsMobileRecipeOpen(!isMobileRecipeOpen)}
            className="flex w-full items-center justify-between p-4 bg-[#EBE3D2] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#7A7463] border border-[#C8BFA8]">
                <BookOpen className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#3E3C32]">Recipes</h3>
                <span className="text-[11px] text-[#7D7765]">
                  {recipes.length} formulations
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F7F2E7] text-[#3E3C32] border border-[#C8BFA8]">
                {recipes.length}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#7D7765] transition-transform duration-200 ${
                  isMobileRecipeOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={1.5}
              />
            </div>
          </button>

          {isMobileRecipeOpen && (
            <div className="p-4 border-t border-[#C8BFA8]">
              <RecipeTabView
                recipes={recipes}
                onDataChange={refreshData}
              />
            </div>
          )}
        </div>

        {/* Accordion 2: Ingredients */}
        <div className="rounded-2xl border border-[#C8BFA8] bg-[#F3EDE0] overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsMobileIngredientsOpen(!isMobileIngredientsOpen)}
            className="flex w-full items-center justify-between p-4 bg-[#EBE3D2] text-left transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F7F2E7] text-[#6B7F5E] border border-[#C8BFA8]">
                <Layers className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-[#3E3C32]">Ingredients</h3>
                <span className="text-[11px] text-[#7D7765]">
                  {ingredients.length} items in stock
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F7F2E7] text-[#3E3C32] border border-[#C8BFA8]">
                {ingredients.length}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#7D7765] transition-transform duration-200 ${
                  isMobileIngredientsOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={1.5}
              />
            </div>
          </button>

          {isMobileIngredientsOpen && (
            <div className="p-4 border-t border-[#C8BFA8]">
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
