import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

function getSafeRedirectPath(rawNext: string | null): string {
  if (!rawNext) return '/';
  // Block protocol-relative URLs (//evil.com), backslashes (/\evil.com), and non-root paths
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

function getSafeOrigin(request: Request, fallbackOrigin: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Fall through if NEXT_PUBLIC_SITE_URL is invalid
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return fallbackOrigin;
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const allowedHosts = (process.env.ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  if (forwardedHost && allowedHosts.includes(forwardedHost.toLowerCase())) {
    return `https://${forwardedHost}`;
  }

  return fallbackOrigin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = getSafeRedirectPath(searchParams.get('next'));
  const safeOrigin = getSafeOrigin(request, origin);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(`${safeOrigin}/?auth_error=config_missing`);
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${safeOrigin}${next}`);
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache');

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers ?? {}).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return response;
    }
  }

  // Redirect to home with error parameter on failure
  return NextResponse.redirect(`${safeOrigin}/?auth_error=exchange_failed`);
}
