'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { OliveSprigSvg, HerbSprigSvg } from '@/components/BotanicalAccents';

export type AuthMethod = 'password' | 'magic_link';
export type PasswordMode = 'sign_in' | 'sign_up';

export function getSafeRedirectPath(rawNext: string | null | undefined): string {
  if (!rawNext) return '/';
  if (
    !rawNext.startsWith('/') ||
    rawNext.startsWith('//') ||
    rawNext.startsWith('/\\')
  ) {
    return '/';
  }
  try {
    const parsed = new URL(rawNext, 'http://localhost');
    if (parsed.origin !== 'http://localhost') return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function formatAuthErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unable to complete sign-in. Please try again.';
  const lower = raw.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials')
  ) {
    return 'Incorrect email or password. Double-check your credentials or try a magic link instead.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the verification link or sign in with a magic link.';
  }

  if (
    lower.includes('unsupported provider') ||
    lower.includes('provider is not enabled') ||
    lower.includes('validation_failed')
  ) {
    return 'Google sign-in is not enabled for this Supabase project yet. Use Email & Password or Magic Link below to sign in right away.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered')
  ) {
    return 'An account with this email already exists. Switch to Sign In or request a Magic Link.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many sign-in requests in a short time. Please wait a moment and try again.';
  }

  if (
    lower.includes('missing next_public_supabase') ||
    lower.includes('supabase') && lower.includes('config')
  ) {
    return 'Authentication is not configured yet. Verify your Supabase environment variables.';
  }

  return raw;
}

interface AuthCardProps {
  redirectTo?: string;
  initialError?: string | null;
  onSuccess?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export function AuthCard({
  redirectTo = '/',
  initialError = null,
  onSuccess,
  onClose,
  showCloseButton = false,
  className = '',
}: AuthCardProps) {
  const router = useRouter();
  const safeRedirect = getSafeRedirectPath(redirectTo);

  const [method, setMethod] = useState<AuthMethod>('password');
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('sign_in');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialErrorDismissed, setInitialErrorDismissed] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  const displayedError = errorMessage ?? (initialErrorDismissed ? null : initialError);

  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const buildCallbackUrl = () => {
    const base = `${window.location.origin}/auth/callback`;
    if (safeRedirect && safeRedirect !== '/') {
      return `${base}?next=${encodeURIComponent(safeRedirect)}`;
    }
    return base;
  };

  const resetFeedback = () => {
    setErrorMessage(null);
    setInitialErrorDismissed(true);
    setConfirmationMessage(null);
  };

  const handleMethodSwitch = (nextMethod: AuthMethod) => {
    setMethod(nextMethod);
    resetFeedback();
  };

  const handlePasswordModeSwitch = (nextMode: PasswordMode) => {
    setPasswordMode(nextMode);
    resetFeedback();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!supabase) {
      setErrorMessage(
        'Authentication is not configured yet. Verify your Supabase environment variables.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (passwordMode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          setErrorMessage(formatAuthErrorMessage(error));
          return;
        }

        onSuccess?.();
        router.refresh();
        if (!onSuccess && safeRedirect) {
          router.push(safeRedirect);
        }
      } else {
        const trimmedName = fullName.trim();
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: buildCallbackUrl(),
            data: trimmedName
              ? {
                  full_name: trimmedName,
                  name: trimmedName,
                }
              : undefined,
          },
        });

        if (error) {
          setErrorMessage(formatAuthErrorMessage(error));
          return;
        }

        if (data.session) {
          onSuccess?.();
          router.refresh();
          if (!onSuccess && safeRedirect) {
            router.push(safeRedirect);
          }
        } else {
          setConfirmationMessage(
            `Account created for ${trimmedEmail}! Check your inbox to confirm your email address, then return here to sign in.`
          );
          setPassword('');
        }
      }
    } catch (err) {
      setErrorMessage(formatAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address to receive a magic link.');
      return;
    }

    if (!supabase) {
      setErrorMessage(
        'Authentication is not configured yet. Verify your Supabase environment variables.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo: buildCallbackUrl(),
        },
      });

      if (error) {
        setErrorMessage(formatAuthErrorMessage(error));
        return;
      }

      setConfirmationMessage(
        `Magic link sent to ${trimmedEmail}. Open the link in your email to finish signing in.`
      );
    } catch (err) {
      setErrorMessage(formatAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    resetFeedback();

    if (!supabase) {
      setErrorMessage(
        'Authentication is not configured yet. Verify your Supabase environment variables.'
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildCallbackUrl(),
        },
      });

      if (error) {
        setErrorMessage(formatAuthErrorMessage(error));
        setIsGoogleLoading(false);
      }
      // On success, browser redirects to Google OAuth consent screen
    } catch (err) {
      setErrorMessage(formatAuthErrorMessage(err));
      setIsGoogleLoading(false);
    }
  };

  const isBusy = isSubmitting || isGoogleLoading;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-[#C8BFA8] bg-[#F3EDE0] p-6 sm:p-8 shadow-2xl ${className}`}
    >
      {/* Subtle botanical line-art background accents */}
      <div className="pointer-events-none absolute -right-2 -top-2 opacity-20">
        <OliveSprigSvg className="h-16 w-16 text-[#7A7463]" size={64} />
      </div>

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4 pb-5 border-b border-[#C8BFA8]">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C8BFA8] bg-[#EBE3D2] px-2.5 py-0.5 text-[11px] font-medium text-[#7D7765] mb-2">
            <HerbSprigSvg className="h-3.5 w-3.5 text-[#7A7463]" size={14} />
            <span>Kora Kitchen Account</span>
          </div>
          <h2
            id="auth-modal-title"
            className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-[#3E3C32] leading-tight"
          >
            {method === 'magic_link'
              ? 'Sign in with a Magic Link'
              : passwordMode === 'sign_up'
                ? 'Open Your Cookbook'
                : 'Welcome Back, Chef'}
          </h2>
          <p className="mt-1 text-xs text-[#7D7765] font-sans">
            Sync your recipes, pantry inventory, meal plans, and macro targets across devices.
          </p>
        </div>

        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="shrink-0 rounded-full p-1.5 text-[#7D7765] hover:text-[#3E3C32] hover:bg-[#EBE3D2] transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Method Switcher Pills */}
      <div className="mt-5 flex items-center rounded-full border border-[#C8BFA8] bg-[#EBE3D2] p-1">
        <button
          type="button"
          onClick={() => handleMethodSwitch('password')}
          className={`flex-1 rounded-full py-1.5 px-3 text-xs font-semibold transition-all ${
            method === 'password'
              ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
              : 'text-[#7D7765] hover:text-[#3E3C32]'
          }`}
        >
          Email &amp; Password
        </button>
        <button
          type="button"
          onClick={() => handleMethodSwitch('magic_link')}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 px-3 text-xs font-semibold transition-all ${
            method === 'magic_link'
              ? 'bg-[#7A7463] text-[#F7F2E7] shadow-xs'
              : 'text-[#7D7765] hover:text-[#3E3C32]'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Magic Link</span>
        </button>
      </div>

      {/* Inline Feedback States (Error / Confirmation) */}
      {(displayedError || confirmationMessage) && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {displayedError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#B86B4B]/45 bg-[#B86B4B]/10 px-3.5 py-2.5 text-xs text-[#8C482C]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B86B4B]" strokeWidth={1.75} />
              <span className="leading-relaxed font-medium">{displayedError}</span>
            </div>
          )}
          {confirmationMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#6B7F5E]/45 bg-[#6B7F5E]/10 px-3.5 py-2.5 text-xs text-[#3E4F34]">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#6B7F5E]" strokeWidth={1.75} />
              <span className="leading-relaxed font-medium">{confirmationMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Email & Password Form */}
      {method === 'password' ? (
        <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-3.5" noValidate>
          {/* Sign In vs Create Account Sub-toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#3E3C32]">
              {passwordMode === 'sign_in' ? 'Sign in to your account' : 'Create a new account'}
            </span>
            <button
              type="button"
              onClick={() =>
                handlePasswordModeSwitch(
                  passwordMode === 'sign_in' ? 'sign_up' : 'sign_in'
                )
              }
              className="font-semibold text-[#7A7463] hover:text-[#3E3C32] underline underline-offset-4 transition-colors"
            >
              {passwordMode === 'sign_in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
            </button>
          </div>

          {passwordMode === 'sign_up' && (
            <div>
              <label
                htmlFor="auth-full-name"
                className="block text-[11px] font-semibold text-[#3E3C32] mb-1"
              >
                Chef Name <span className="font-normal text-[#7D7765]">(optional)</span>
              </label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]"
                  strokeWidth={1.75}
                />
                <input
                  id="auth-full-name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Arvind, Riya"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isBusy}
                  className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-9 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs disabled:opacity-60"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-password-email"
              className="block text-[11px] font-semibold text-[#3E3C32] mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]"
                strokeWidth={1.75}
              />
              <input
                id="auth-password-email"
                type="email"
                autoComplete="email"
                placeholder="chef@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isBusy}
                required
                className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-9 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password-input"
              className="block text-[11px] font-semibold text-[#3E3C32] mb-1"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]"
                strokeWidth={1.75}
              />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  passwordMode === 'sign_in' ? 'current-password' : 'new-password'
                }
                placeholder={
                  passwordMode === 'sign_in' ? 'Enter your password' : 'At least 6 characters'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isBusy}
                required
                className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-9 pr-10 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7D7765] hover:text-[#3E3C32] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                ) : (
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] px-5 py-2.5 text-xs font-semibold shadow-xs border border-[#7A7463] transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {passwordMode === 'sign_in' ? 'Signing in...' : 'Creating account...'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {passwordMode === 'sign_in' ? 'Sign In' : 'Create Account'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </>
            )}
          </button>
        </form>
      ) : (
        /* Magic Link (OTP) Form */
        <form onSubmit={handleMagicLinkSubmit} className="mt-5 space-y-3.5" noValidate>
          <p className="text-xs text-[#7D7765] leading-relaxed">
            Enter your email and we&apos;ll send a one-click sign-in link—no password required.
          </p>

          <div>
            <label
              htmlFor="auth-magic-email"
              className="block text-[11px] font-semibold text-[#3E3C32] mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7D7765]"
                strokeWidth={1.75}
              />
              <input
                id="auth-magic-email"
                type="email"
                autoComplete="email"
                placeholder="chef@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isBusy}
                required
                className="w-full rounded-full bg-[#F7F2E7] border border-[#C8BFA8] pl-9 pr-4 py-2 text-xs text-[#3E3C32] placeholder:text-[#7D7765] focus:outline-none focus:ring-1 focus:ring-[#7A7463] shadow-xs disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#7A7463] hover:bg-[#696353] text-[#F7F2E7] px-5 py-2.5 text-xs font-semibold shadow-xs border border-[#7A7463] transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending Magic Link...</span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Send Magic Link</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#C8BFA8]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7D7765]">
          or continue with
        </span>
        <div className="h-px flex-1 bg-[#C8BFA8]" />
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isBusy}
        className="w-full inline-flex items-center justify-center gap-2.5 rounded-full border border-[#C8BFA8] bg-[#F7F2E7] hover:bg-[#EBE3D2] px-4 py-2.5 text-xs font-semibold text-[#3E3C32] shadow-xs transition-colors disabled:opacity-60"
      >
        {isGoogleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#7A7463]" />
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
        )}
        <span>{isGoogleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
      </button>
    </div>
  );
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  redirectTo = '/',
}: AuthModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E3C32]/45 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-md my-8">
        <AuthCard
          redirectTo={redirectTo}
          showCloseButton
          onClose={onClose}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
        />
      </div>
    </div>
  );
}

export default AuthModal;
