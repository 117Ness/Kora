'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Sliders,
  Flame,
  Plus,
  Check,
  User,
  LogOut,
  LogIn,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile, updateUserProfile } from '@/app/actions/profile';
import type { UserProfile, UpdateUserProfileInput } from '@/types/kora';
import { OliveSprigSvg } from '@/components/BotanicalAccents';
import { AuthModal } from '@/components/auth/AuthModal';

const PRESET_COOKWARE = [
  'Induction Cooktop',
  'Gas Stove',
  'Non-Stick Pan',
  'Kadhai',
  'Pressure Cooker',
  'Mixer Grinder',
  'Electric Kettle',
  'Microwave',
  'OTG / Oven',
  'Air Fryer',
];

const PRESET_MICROS = [
  'Iron',
  'Calcium',
  'Fiber',
  'Vitamin D',
  'Vitamin C',
  'Zinc',
  'Potassium',
  'B12',
  'Magnesium',
];

interface KitchenProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (profile: UserProfile) => void;
  onOpenAuth?: () => void;
}

export function KitchenProfileModal({
  isOpen,
  onClose,
  onProfileUpdated,
  onOpenAuth,
}: KitchenProfileModalProps) {
  const router = useRouter();
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [calories, setCalories] = useState(2800);
  const [protein, setProtein] = useState(120);
  const [carbs, setCarbs] = useState(350);
  const [fats, setFats] = useState(85);
  const [microGoals, setMicroGoals] = useState<string[]>([]);
  const [cookware, setCookware] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState('');

  // Custom pill input states
  const [customCookware, setCustomCookware] = useState('');
  const [customMicro, setCustomMicro] = useState('');

  // Auth states
  const [isLocalAuthOpen, setIsLocalAuthOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form submission state
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  // Load active profile and auth user on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      // 1. Check auth user
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (isMounted) {
          setAuthUserEmail(user?.email ?? null);
        }
      }

      // 2. Load user profile
      const res = await getUserProfile();
      if (res.success && isMounted) {
        const p = res.data;
        setDisplayName(p.display_name || '');
        setCalories(p.daily_calorie_target || 2800);
        setProtein(p.protein_target_g || 120);
        setCarbs(p.carbs_target_g || 350);
        setFats(p.fats_target_g || 85);
        setMicroGoals(p.micro_goals || []);
        setCookware(
          p.cookware && p.cookware.length > 0
            ? p.cookware
            : ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker']
        );
        setDietaryPrefs(p.dietary_preferences || '');
      }
    }

    loadData();

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setAuthUserEmail(session?.user?.email ?? null);
        setAuthError(null);
      }
      loadData();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  // Toggle cookware item
  const toggleCookware = (item: string) => {
    setCookware((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomCookware = () => {
    const trimmed = customCookware.trim();
    if (trimmed && !cookware.includes(trimmed)) {
      setCookware((prev) => [...prev, trimmed]);
      setCustomCookware('');
    }
  };

  // Toggle micronutrient goal
  const toggleMicro = (item: string) => {
    setMicroGoals((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustomMicro = () => {
    const trimmed = customMicro.trim();
    if (trimmed && !microGoals.includes(trimmed)) {
      setMicroGoals((prev) => [...prev, trimmed]);
      setCustomMicro('');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    if (!supabase || isSigningOut) return;
    setAuthError(null);
    setAuthStatus(null);
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
        return;
      }
      setAuthUserEmail(null);
      setAuthStatus('Signed out successfully.');
      // Reload guest profile and refresh server-rendered views
      const res = await getUserProfile();
      if (res.success) {
        const p = res.data;
        setDisplayName(p.display_name || '');
        setCalories(p.daily_calorie_target || 2800);
        setProtein(p.protein_target_g || 120);
        setCarbs(p.carbs_target_g || 350);
        setFats(p.fats_target_g || 85);
        setMicroGoals(p.micro_goals || []);
        setCookware(
          p.cookware && p.cookware.length > 0
            ? p.cookware
            : ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker']
        );
        setDietaryPrefs(p.dietary_preferences || '');
        onProfileUpdated?.(p);
      }
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  // Save profile changes
  const handleSave = () => {
    setSaveStatus(null);
    startTransition(async () => {
      const payload: UpdateUserProfileInput = {
        display_name: displayName.trim() || null,
        daily_calorie_target: Number(calories) || 2800,
        protein_target_g: Number(protein) || 120,
        carbs_target_g: Number(carbs) || 350,
        fats_target_g: Number(fats) || 85,
        micro_goals: microGoals,
        cookware: cookware,
        dietary_preferences: dietaryPrefs.trim() || null,
      };

      const res = await updateUserProfile(payload);
      if (res.success) {
        setSaveStatus('Preferences saved successfully ✓');
        onProfileUpdated?.(res.data);
        router.refresh();
        setTimeout(() => {
          setSaveStatus(null);
          onClose();
        }, 800);
      } else {
        setSaveStatus(
          authUserEmail
            ? `Error: ${res.error}`
            : 'Sign in above to save your profile & kitchen targets.'
        );
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kitchen-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#3E3C32]/45 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] shadow-2xl p-6 sm:p-8 my-8 max-h-[92vh] flex flex-col">
        {/* Header with Botanical Accent */}
        <div className="flex items-start justify-between pb-4 border-b border-[#C8BFA8]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] text-[#7A7463] shadow-xs">
              <Sliders className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="kitchen-profile-title"
                  className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#3E3C32]"
                >
                  Kitchen & Nutrition Goals
                </h2>
                <OliveSprigSvg className="h-5 w-5 text-[#7A7463] hidden sm:block opacity-75" />
              </div>
              <p className="text-xs text-[#7D7765] mt-0.5 font-sans">
                Calibrate daily macro targets, flat cookware limits, and dietary notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Section 0: User Identity & Multi-User Switch Strip */}
          <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F2E7] border border-[#C8BFA8] text-[#7A7463]">
                  <User className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#3E3C32] flex items-center gap-1.5">
                    <span className="truncate">
                      {authUserEmail
                        ? displayName.trim() || authUserEmail.split('@')[0]
                        : 'Guest Mode (Local)'}
                    </span>
                    {authUserEmail && (
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#6B7F5E]"
                        title="Signed in"
                      />
                    )}
                  </div>
                  <div className="text-[11px] text-[#7D7765] truncate">
                    {authUserEmail ?? 'Sign in to sync your profile across devices'}
                  </div>
                </div>
              </div>

              {authUserEmail ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C8BFA8] bg-[#F7F2E7] hover:bg-[#F3EDE0] px-3.5 py-1.5 text-[11px] font-medium text-[#7D7765] hover:text-[#3E3C32] transition-colors self-start sm:self-auto disabled:opacity-50"
                >
                  <LogOut className="h-3 w-3" strokeWidth={1.75} />
                  <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenAuth) {
                        onOpenAuth();
                      } else {
                        setIsLocalAuthOpen(true);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] px-3.5 py-1.5 text-[11px] font-semibold shadow-xs transition-colors"
                  >
                    <LogIn className="h-3 w-3" strokeWidth={1.75} />
                    <span>Sign In</span>
                  </button>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="inline-flex items-center rounded-full border border-[#C8BFA8] bg-[#F7F2E7] hover:bg-[#F3EDE0] px-3 py-1.5 text-[11px] font-medium text-[#3E3C32] transition-colors"
                  >
                    Full Login Page
                  </Link>
                </div>
              )}
            </div>

            {authStatus && (
              <div className="mt-2.5 text-[#3E4F34] text-[11px] font-medium bg-[#6B7F5E]/10 rounded-xl px-3 py-1.5 border border-[#6B7F5E]/40">
                {authStatus}
              </div>
            )}
            {authError && (
              <div className="mt-2.5 text-[#8C482C] text-[11px] font-medium bg-[#B86B4B]/10 rounded-xl px-3 py-1.5 border border-[#B86B4B]/40 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#B86B4B]" />
                <span>{authError}</span>
              </div>
            )}
          </div>

          {/* Section 1: Display Name */}
          <div>
            <label
              htmlFor="display-name"
              className="block text-xs font-semibold text-[#3E3C32] mb-1 font-sans"
            >
              Chef / Display Name
            </label>
            <input
              id="display-name"
              type="text"
              placeholder="e.g. Arvind, Riya"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F2E7] border border-[#C8BFA8] px-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs font-sans"
            />
          </div>

          {/* Section 2: Daily Macro Targets Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#3E3C32] font-sans flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.75} />
                <span>Daily Nutritional Targets</span>
              </label>
              <span className="text-[11px] text-[#7D7765] font-mono">
                P: {protein}g &bull; C: {carbs}g &bull; F: {fats}g
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3">
                <span className="block text-[11px] font-medium text-[#7D7765] mb-1">
                  Calories (kcal)
                </span>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={50}
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3 py-1.5 text-xs font-mono font-bold text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                />
              </div>

              <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3">
                <span className="block text-[11px] font-medium text-[#7D7765] mb-1">
                  Protein (g)
                </span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={5}
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3 py-1.5 text-xs font-mono font-bold text-[#7A7463] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                />
              </div>

              <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3">
                <span className="block text-[11px] font-medium text-[#7D7765] mb-1">
                  Carbs (g)
                </span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  step={5}
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3 py-1.5 text-xs font-mono font-bold text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                />
              </div>

              <div className="rounded-2xl border border-[#C8BFA8] bg-[#EBE3D2] p-3">
                <span className="block text-[11px] font-medium text-[#7D7765] mb-1">
                  Fats (g)
                </span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={5}
                  value={fats}
                  onChange={(e) => setFats(Number(e.target.value))}
                  className="w-full rounded-xl bg-[#F7F2E7] border border-[#C8BFA8] px-3 py-1.5 text-xs font-mono font-bold text-[#3E3C32] focus:outline-none focus:ring-1 focus:ring-[#7A7463]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Flat Cookware Multi-Select Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#3E3C32] font-sans flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.75} />
                <span>Available Flat Cookware (Strict Constraint)</span>
              </label>
              <span className="text-[11px] text-[#7D7765]">
                {cookware.length} selected
              </span>
            </div>
            <p className="text-[11px] text-[#7D7765] mb-2 font-sans">
              Kora Chef will NEVER recommend baking in an oven or appliances you do not own.
            </p>

            {/* Preset Toggle Pills */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRESET_COOKWARE.map((item) => {
                const active = cookware.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleCookware(item)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#7A7463] text-[#F7F2E7] border border-[#7A7463] shadow-xs'
                        : 'bg-[#EBE3D2] text-[#7D7765] border border-[#C8BFA8] hover:text-[#3E3C32] hover:bg-[#E4DCCB]'
                    }`}
                  >
                    {active && <Check className="h-3 w-3 stroke-[2.5]" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Cookware Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add other cookware (e.g. Cast Iron Tawa, Toaster)"
                value={customCookware}
                onChange={(e) => setCustomCookware(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomCookware();
                  }
                }}
                className="flex-1 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-1.5 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs font-sans"
              />
              <button
                type="button"
                onClick={addCustomCookware}
                className="inline-flex items-center gap-1 rounded-full bg-[#EBE3D2] hover:bg-[#E4DCCB] text-[#3E3C32] border border-[#C8BFA8] px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Section 4: Micronutrient Focus Tags */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#3E3C32] font-sans">
                Micronutrient & Health Focus
              </label>
              <span className="text-[11px] text-[#7D7765]">
                {microGoals.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {PRESET_MICROS.map((item) => {
                const active = microGoals.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleMicro(item)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#7A7463] text-[#F7F2E7] border border-[#7A7463] shadow-xs'
                        : 'bg-[#EBE3D2] text-[#7D7765] border border-[#C8BFA8] hover:text-[#3E3C32] hover:bg-[#E4DCCB]'
                    }`}
                  >
                    {active && <Check className="h-3 w-3 stroke-[2.5]" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add other goal (e.g. Low Sodium, Gut Health)"
                value={customMicro}
                onChange={(e) => setCustomMicro(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomMicro();
                  }
                }}
                className="flex-1 rounded-full bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-1.5 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs font-sans"
              />
              <button
                type="button"
                onClick={addCustomMicro}
                className="inline-flex items-center gap-1 rounded-full bg-[#EBE3D2] hover:bg-[#E4DCCB] text-[#3E3C32] border border-[#C8BFA8] px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Section 5: Dietary Preferences & Allergies */}
          <div>
            <label
              htmlFor="dietary-notes"
              className="block text-xs font-semibold text-[#3E3C32] mb-1 font-sans"
            >
              Dietary Notes, Preferences & Allergies
            </label>
            <textarea
              id="dietary-notes"
              rows={3}
              placeholder="e.g. Vegetarian, High-protein breakfast, avoid mushrooms, minimal oil tadka, North & South Indian staples..."
              value={dietaryPrefs}
              onChange={(e) => setDietaryPrefs(e.target.value)}
              className="w-full rounded-2xl bg-[#F7F2E7] border border-[#C8BFA8] px-3.5 py-2.5 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs font-sans resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#C8BFA8] flex items-center justify-between gap-3">
          <div className="text-xs font-medium">
            {saveStatus && (
              <span className="text-[#7A7463] font-semibold animate-fade-in">
                {saveStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-xs font-medium text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] px-5 py-2 text-xs font-semibold shadow-xs border border-[#7A7463] transition-all disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Profile & Goals'}
            </button>
          </div>
        </div>
      </div>

      {!onOpenAuth && (
        <AuthModal
          isOpen={isLocalAuthOpen}
          onClose={() => setIsLocalAuthOpen(false)}
        />
      )}
    </div>
  );
}

export default KitchenProfileModal;
