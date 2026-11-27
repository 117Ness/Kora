'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, LogOut, User, ChefHat } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthCard, getSafeRedirectPath } from '@/components/auth/AuthModal';
import { BotanicalFlourishSvg } from '@/components/BotanicalAccents';

interface LoginClientViewProps {
  initialUserEmail: string | null;
  initialDisplayName: string | null;
}

export function LoginClientView({
  initialUserEmail,
  initialDisplayName,
}: LoginClientViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);
  const [displayName, setDisplayName] = useState<string | null>(initialDisplayName);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const safeNext = getSafeRedirectPath(searchParams.get('next'));
  const authErrorParam = searchParams.get('auth_error');

  const initialError =
    authErrorParam === 'config_missing'
      ? 'Authentication configuration is missing. Check your Supabase environment variables.'
      : authErrorParam === 'exchange_failed'
        ? 'Your sign-in link expired or could not be verified. Please sign in again below.'
        : null;

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextEmail = session?.user?.email ?? null;
      setUserEmail(nextEmail);
      if (!nextEmail) {
        setDisplayName(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
      setDisplayName(null);
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md py-6 sm:py-12">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#C8BFA8] bg-[#EBE3D2] hover:bg-[#E4DCCB] px-3.5 py-1.5 text-xs font-medium text-[#3E3C32] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.75} />
          <span>Back to Planner</span>
        </Link>

        <BotanicalFlourishSvg className="h-3.5 w-16 text-[#C8BFA8]" />
      </div>

      {userEmail ? (
        <div className="rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2] p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C8BFA8] bg-[#F7F2E7] text-[#7A7463]">
              <User className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7F5E]">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Signed In</span>
              </div>
              <h1 className="font-serif text-xl font-bold text-[#3E3C32] truncate">
                {displayName || userEmail.split('@')[0]}
              </h1>
              <p className="text-xs text-[#7D7765] truncate">{userEmail}</p>
            </div>
          </div>

          <p className="text-xs text-[#7D7765] leading-relaxed">
            Your Kora kitchen profile, weekly meal plans, and pantry inventory are synced to this account.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <Link
              href={safeNext}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] px-4 py-2.5 text-xs font-semibold shadow-xs transition-colors"
            >
              <ChefHat className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Open My Kitchen</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#C8BFA8] bg-[#F7F2E7] hover:bg-[#F3EDE0] px-4 py-2.5 text-xs font-semibold text-[#3E3C32] transition-colors disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5 text-[#7A7463]" strokeWidth={1.75} />
              <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <AuthCard
            redirectTo={safeNext}
            initialError={initialError}
            onSuccess={() => {
              router.push(safeNext);
              router.refresh();
            }}
          />

          <p className="mt-4 text-center text-[11px] text-[#7D7765]">
            Just exploring?{' '}
            <Link
              href="/"
              className="font-semibold text-[#7A7463] hover:text-[#3E3C32] underline underline-offset-4"
            >
              Continue in Guest Mode
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
