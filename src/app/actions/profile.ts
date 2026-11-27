'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { updateUserProfileSchema } from '@/lib/validators';
import type { UserProfile, UpdateUserProfileInput } from '@/types/kora';

export type ProfileActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function ok<T>(data: T): ProfileActionResult<T> {
  return { success: true, data };
}

function err(message: string): ProfileActionResult<never> {
  return { success: false, error: message };
}

function zodErr(e: z.ZodError): ProfileActionResult<never> {
  return err(e.issues.map((issue) => issue.message).join('; '));
}

const GUEST_PROFILE: UserProfile = {
  id: 'guest',
  display_name: 'Guest Chef',
  daily_calorie_target: 2800,
  protein_target_g: 120,
  carbs_target_g: 350,
  fats_target_g: 85,
  micro_goals: ['High Fiber', 'Iron Rich'],
  cookware: ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker'],
  dietary_preferences: null,
  updated_at: '1970-01-01T00:00:00.000Z',
};

/**
 * Retrieve user profile for the authenticated user, falling back safely to
 * upsert if a legacy user lacks a row (new signups are auto-provisioned via DB trigger),
 * or returning sensible flat-living guest defaults when unauthenticated.
 */
export async function getUserProfile(): Promise<ProfileActionResult<UserProfile>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return ok(GUEST_PROFILE);
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return err(profileError.message);
    }

    if (profile) {
      return ok(profile as UserProfile);
    }

    // Legacy fallback for users created before the handle_new_user() trigger.
    // Uses upsert with ignoreDuplicates to avoid concurrent SSR insert races.
    const initialName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Kora Chef';

    const defaultProfile = {
      id: user.id,
      display_name: initialName,
      daily_calorie_target: 2800,
      protein_target_g: 120,
      carbs_target_g: 350,
      fats_target_g: 85,
      micro_goals: ['High Fiber', 'Iron Rich'],
      cookware: ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker'],
      dietary_preferences: null,
    };

    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(defaultProfile, { onConflict: 'id', ignoreDuplicates: true });

    if (upsertError) {
      return err(upsertError.message);
    }

    const { data: resolvedProfile, error: refetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (refetchError) {
      return err(refetchError.message);
    }

    return ok(resolvedProfile as UserProfile);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to retrieve profile');
  }
}

/**
 * Update user profile preferences, macro targets, and cookware setup.
 */
export async function updateUserProfile(
  input: UpdateUserProfileInput,
): Promise<ProfileActionResult<UserProfile>> {
  const parsed = updateUserProfileSchema.safeParse(input);
  if (!parsed.success) {
    return zodErr(parsed.error);
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return err('Please sign in to save your profile & kitchen targets.');
    }

    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: user.id,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (updateError) {
      return err(updateError.message);
    }

    revalidatePath('/');
    revalidatePath('/insights');
    revalidatePath('/library');
    return ok(updated as UserProfile);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Failed to update profile');
  }
}
