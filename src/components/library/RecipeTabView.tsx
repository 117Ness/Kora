'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]" strokeWidth={1.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes, ingredients, or notes..."
            className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-10 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-xs border border-[#7A7463] transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span>New Recipe</span>
          </button>
        </div>
      </div>

      {/* Recipes List / Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#C8BFA8] bg-[#EBE3D2]/40 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBE3D2] border border-[#C8BFA8] text-[#7A7463]">
            <UtensilsCrossed className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <h4 className="mt-3 font-serif text-sm font-bold text-[#3E3C32]">
            {searchQuery ? 'No matching recipes found' : 'No recipes created yet'}
          </h4>
          <p className="mt-1 text-xs text-[#7D7765] max-w-xs font-sans">
            {searchQuery
              ? `Try adjusting your search query "${searchQuery}"`
              : 'Assemble your first kitchen creation with custom ingredients and macro tracking.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#7A7463] text-[#F7F2E7] hover:bg-[#696353] border border-[#7A7463] transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
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
      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          isOpen={!!editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSuccess={onDataChange}
        />
      )}

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

export default RecipeTabView;
