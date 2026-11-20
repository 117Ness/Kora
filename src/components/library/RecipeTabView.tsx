'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import type { RecipeWithIngredients } from '@/types/kora';
import { RecipeCard } from './RecipeCard';
import { EditRecipeModal } from './EditRecipeModal';
import { CreateRecipeModal } from '@/components/planner/CreateRecipeModal';

interface RecipeTabViewProps {
  recipes: RecipeWithIngredients[];
  onDataChange: () => Promise<void>;
}

export function RecipeTabView({
  recipes,
  onDataChange,
}: RecipeTabViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase().trim();
    return recipes.filter((r) => {
      const matchName = r.name.toLowerCase().includes(q);
      const matchNotes = r.notes?.toLowerCase().includes(q);
      const matchIngredients = r.recipe_ingredients?.some((ri) =>
        ri.ingredient?.name?.toLowerCase().includes(q)
      );
      return matchName || matchNotes || matchIngredients;
    });
  }, [recipes, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes, ingredients, or notes..."
            className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>New Recipe</span>
          </button>
        </div>
      </div>

      {/* Recipes List / Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h4 className="mt-3 text-sm font-semibold text-slate-200">
            {searchQuery ? 'No matching recipes found' : 'No recipes created yet'}
          </h4>
          <p className="mt-1 text-xs text-slate-400 max-w-xs">
            {searchQuery
              ? `Try adjusting your search query "${searchQuery}"`
              : 'Assemble your first kitchen creation with custom ingredients and macro tracking.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create Recipe</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onEdit={(r) => setEditingRecipe(r)}
              onDataChange={onDataChange}
            />
          ))}
        </div>
      )}

      {/* Edit Recipe Modal */}
      <EditRecipeModal
        recipe={editingRecipe}
        isOpen={Boolean(editingRecipe)}
        onClose={() => setEditingRecipe(null)}
        onSuccess={onDataChange}
      />

      {/* Create Recipe Modal */}
      <CreateRecipeModal
        isOpen={isCreateModalOpen}
        onOpen={() => setIsCreateModalOpen(true)}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={onDataChange}
      />
    </div>
  );
}
