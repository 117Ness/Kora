import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/app/actions/profile';
import { LoginClientView } from '@/components/auth/LoginClientView';

function LoginSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md py-8 sm:py-14">
      <div className="rounded-3xl border border-[#C8BFA8] bg-[#EBE3D2]/60 p-8 shadow-sm animate-pulse space-y-4">
        <div className="h-5 w-32 rounded-full bg-[#C8BFA8]/50" />
        <div className="h-8 w-56 rounded-xl bg-[#C8BFA8]/50" />
        <div className="h-4 w-full rounded-xl bg-[#C8BFA8]/40" />
        <div className="h-10 w-full rounded-full bg-[#C8BFA8]/50 mt-4" />
        <div className="h-10 w-full rounded-full bg-[#C8BFA8]/40" />
        <div className="h-10 w-full rounded-full bg-[#C8BFA8]/40" />
        <div className="h-10 w-full rounded-full bg-[#7A7463]/40" />
      </div>
    </div>
  );
}

async function LoginContentLoader() {
  let userEmail: string | null = null;
  let displayName: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    if (user) {
      const profileRes = await getUserProfile();
      if (profileRes.success) {
        displayName = profileRes.data.display_name;
      }
    }
  } catch {
    // Gracefully degrade when Supabase env vars are absent
  }

  return (
    <LoginClientView
      initialUserEmail={userEmail}
      initialDisplayName={displayName}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContentLoader />
    </Suspense>
  );
}
