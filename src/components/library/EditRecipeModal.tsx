'use client';

import { useState, useTransition } from 'react';
import { X, AlertCircle, Save, ChefHat } from 'lucide-react';
import type { RecipeWithIngredients } from '@/types/kora';
import { updateRecipe } from '@/app/actions/kora';

interface EditRecipeModalProps {
  recipe: RecipeWithIngredients | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

function EditRecipeDialog({
  recipe,
  onClose,
  onSuccess,
}: {
  recipe: RecipeWithIngredients;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(recipe.name || '');
  const [notes, setNotes] = useState(recipe.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await updateRecipe(recipe.id, {
        name: name.trim(),
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      await onSuccess();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#3E3C32]/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] p-6 sm:p-7 shadow-2xl transition-all z-10 text-[#3E3C32]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#C8BFA8] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBE3D2] text-[#7A7463] border border-[#C8BFA8] shadow-xs">
              <ChefHat className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3E3C32] tracking-tight">Edit Recipe</h3>
              <p className="text-xs text-[#7D7765] font-sans">
                Update the recipe title and preparation notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] border border-[#C8BFA8]/60 transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#B86B4B]/15 border border-[#B86B4B]/40 p-3 text-xs text-[#B86B4B]">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
              Recipe Name <span className="text-[#B86B4B]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-sm text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#3E3C32] mb-1.5 font-sans">
              Preparation Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add cooking tips, oven temperatures, or seasoning adjustments..."
              className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] resize-none shadow-xs transition-colors"
            />
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#C8BFA8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-medium text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] border border-[#7A7463] shadow-xs transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditRecipeModal(props: EditRecipeModalProps) {
  if (!props.isOpen || !props.recipe) return null;
  return <EditRecipeDialog recipe={props.recipe} onClose={props.onClose} onSuccess={props.onSuccess} />;
}

export default EditRecipeModal;
