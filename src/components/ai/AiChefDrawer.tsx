'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  ChefHat,
  Loader2,
} from 'lucide-react';
import { RecipeProposalCard } from './RecipeProposalCard';
import { OliveSprigSvg } from '@/components/BotanicalAccents';
import type {
  ProposedRecipePayload,
  ScaledRecipePayload,
  MacroMealPlanPayload,
} from '@/types/ai';

const STARTER_PROMPTS = [
  'Add a high-protein masala scrambled eggs recipe',
  'Scale an existing recipe to 5 eggs for my gym diet',
  'Plan today meals to hit my calorie & protein targets using only my cookware',
];

interface AiChefDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeSaved?: () => void;
}

export function AiChefDrawer({
  isOpen,
  onClose,
  onRecipeSaved,
}: AiChefDrawerProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const isGenerating = status === 'streaming' || status === 'submitted';

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || isGenerating) return;

    setInputText('');
    await sendMessage({ text });
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-chef-drawer-title"
      className="fixed inset-0 z-50 overflow-hidden bg-[#3E3C32]/40 backdrop-blur-xs flex justify-end"
    >
      <div className="relative w-full sm:max-w-xl h-full bg-[#F3EDE0] border-l border-[#C8BFA8] shadow-2xl flex flex-col animate-slide-left">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#C8BFA8] bg-[#F3EDE0]/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] text-[#7A7463] shadow-xs">
              <ChefHat className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="ai-chef-drawer-title"
                  className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#3E3C32]"
                >
                  Kora Chef
                </h2>
                <span className="inline-flex items-center rounded-full border border-[#C8BFA8] bg-[#EBE3D2] px-2 py-0.5 text-[10px] font-semibold text-[#7A7463] font-sans">
                  AI Culinary Architect
                </span>
              </div>
              <p className="text-[11px] text-[#7D7765] font-sans">
                Curates recipes strictly for your flat cookware & macro targets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                title="Clear conversation"
                className="rounded-full p-2 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            /* Empty State: Warm Botanical Welcome & Starter Chips */
            <div className="h-full flex flex-col justify-center items-center text-center px-4 py-8 max-w-md mx-auto">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] text-[#7A7463] mb-3 shadow-xs">
                <Sparkles className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#3E3C32] mb-1">
                Namaste! What are we cooking today?
              </h3>
              <p className="text-xs text-[#7D7765] leading-relaxed mb-6 font-sans">
                I know your kitchen inventory, daily calorie targets, and available cookware. Ask me to propose new recipes, scale existing batches, or build a daily macro plan.
              </p>

              {/* Quick Starter Chips */}
              <div className="w-full space-y-2 text-left">
                <span className="block text-[11px] font-semibold text-[#7D7765] uppercase tracking-wider mb-1">
                  Try asking:
                </span>
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] hover:bg-[#E4DCCB] hover:border-[#7A7463] p-3 text-xs text-[#3E3C32] font-medium transition-all shadow-xs flex items-center justify-between group"
                  >
                    <span>&ldquo;{prompt}&rdquo;</span>
                    <Sparkles className="h-3.5 w-3.5 text-[#7A7463] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#EBE3D2] border border-[#C8BFA8] text-[#7A7463] shrink-0 mt-0.5">
                      <Bot className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Render Message Parts */}
                    {message.parts?.map((part, pIdx) => {
                      if (part.type === 'text') {
                        return (
                          <div
                            key={pIdx}
                            className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                              isUser
                                ? 'bg-[#7A7463] text-[#F7F2E7] rounded-tr-xs font-sans'
                                : 'bg-[#EBE3D2] text-[#3E3C32] border border-[#C8BFA8] rounded-tl-xs font-sans'
                            }`}
                          >
                            {part.text}
                          </div>
                        );
                      }

                      // Tool: proposeRecipe
                      if (
                        part.type === 'tool-proposeRecipe' ||
                        part.type.includes('proposeRecipe')
                      ) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const toolPart = part as any;
                        const output = toolPart.output as ProposedRecipePayload | undefined;
                        const input = toolPart.input as ProposedRecipePayload | undefined;
                        const data = output ?? input;

                        if (!data) {
                          return (
                            <div
                              key={pIdx}
                              className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3 text-xs text-[#7D7765] flex items-center gap-2"
                            >
                              <Loader2 className="h-4 w-4 animate-spin text-[#7A7463]" />
                              <span>Drafting customized recipe...</span>
                            </div>
                          );
                        }

                        return (
                          <RecipeProposalCard
                            key={pIdx}
                            proposal={data}
                            onAccepted={onRecipeSaved}
                            defaultExpanded={false}
                          />
                        );
                      }

                      // Tool: scaleExistingRecipe
                      if (
                        part.type === 'tool-scaleExistingRecipe' ||
                        part.type.includes('scaleExistingRecipe')
                      ) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const toolPart = part as any;
                        const output = toolPart.output as ScaledRecipePayload | undefined;
                        const input = toolPart.input as ScaledRecipePayload | undefined;
                        const data = output ?? input;

                        if (!data) {
                          return (
                            <div
                              key={pIdx}
                              className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3 text-xs text-[#7D7765] flex items-center gap-2"
                            >
                              <Loader2 className="h-4 w-4 animate-spin text-[#7A7463]" />
                              <span>Recalculating proportions and macros...</span>
                            </div>
                          );
                        }

                        return (
                          <RecipeProposalCard
                            key={pIdx}
                            proposal={data}
                            onAccepted={onRecipeSaved}
                            defaultExpanded={true}
                          />
                        );
                      }

                      // Tool: generateMacroMealPlan
                      if (
                        part.type === 'tool-generateMacroMealPlan' ||
                        part.type.includes('generateMacroMealPlan')
                      ) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const toolPart = part as any;
                        const output = toolPart.output as MacroMealPlanPayload | undefined;
                        const input = toolPart.input as MacroMealPlanPayload | undefined;
                        const data = output ?? input;

                        if (!data) {
                          return (
                            <div
                              key={pIdx}
                              className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3 text-xs text-[#7D7765] flex items-center gap-2"
                            >
                              <Loader2 className="h-4 w-4 animate-spin text-[#7A7463]" />
                              <span>Calibrating daily macro meal plan...</span>
                            </div>
                          );
                        }

                        return (
                          <div key={pIdx} className="space-y-3 w-full">
                            <div className="rounded-2xl bg-[#7A7463] text-[#F7F2E7] p-3 text-xs">
                              <span className="font-serif font-bold text-sm block">
                                📅 {data.plan_date || 'Target Daily Plan'}
                              </span>
                              <span className="text-[11px] opacity-90">
                                Target: {data.target_summary?.calories} kcal &bull; P:{' '}
                                {data.target_summary?.protein_g}g &bull; C:{' '}
                                {data.target_summary?.carbs_g}g &bull; F:{' '}
                                {data.target_summary?.fats_g}g
                              </span>
                            </div>

                            {data.meals?.map((meal, mIdx) => (
                              <RecipeProposalCard
                                key={meal.mealProposalId || mIdx}
                                proposal={{
                                  type: 'proposed_recipe',
                                  proposalId: meal.mealProposalId,
                                  meal_category: meal.meal_category,
                                  ...meal.recipe,
                                  total_nutrition: meal.recipe.nutrition,
                                  total_cost_inr: meal.recipe.estimated_cost_inr,
                                  cost_per_serving_inr: meal.recipe.estimated_cost_inr,
                                  servings: 1,
                                  prep_time_minutes: 15,
                                  cook_time_minutes: 15,
                                }}
                                onAccepted={onRecipeSaved}
                              />
                            ))}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>

                  {isUser && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#7A7463] text-[#F7F2E7] shrink-0 mt-0.5 shadow-xs">
                      <User className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Thinking / Streaming Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-[#7D7765] animate-pulse pl-9">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7A7463]" />
              <span>Kora Chef is crafting recipe instructions...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl bg-red-100/70 border border-red-300 p-3 text-xs text-red-800">
              Error connecting to AI Chef: {error.message}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Area */}
        <div className="p-3 sm:p-4 border-t border-[#C8BFA8] bg-[#F3EDE0]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask Kora Chef (e.g. 300g chicken dinner with pressure cooker)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isGenerating}
              className="flex-1 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-4 py-2.5 text-xs sm:text-sm text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs font-sans disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isGenerating}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] shadow-xs transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#7D7765] px-2 font-sans">
            <span>Powered by Gemini &bull; Flat-Cookware Aware</span>
            <OliveSprigSvg className="h-3 w-3 text-[#7A7463] opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiChefDrawer;
