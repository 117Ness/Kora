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
  daily_calorie_target: 2200,
  protein_target_g: 100,
  carbs_target_g: 250,
  fats_target_g: 70,
  micro_goals: ['High Fiber', 'Iron Rich'],
  cookware: ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker'],
  dietary_preferences: null,
  updated_at: new Date().toISOString(),
};

/**
 * Retrieve user profile for authenticated user, auto-creating a default profile
 * on first login, or returning a sensible guest profile fallback when unauthenticated.
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

    // Auto-create initial profile on first load
    const initialName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Kora Chef';

    const defaultProfile = {
      id: user.id,
      display_name: initialName,
      daily_calorie_target: 2200,
      protein_target_g: 100,
      carbs_target_g: 250,
      fats_target_g: 70,
      micro_goals: ['High Fiber'],
      cookware: ['Induction Cooktop', 'Non-Stick Pan', 'Pressure Cooker'],
      dietary_preferences: null,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('user_profiles')
      .insert(defaultProfile)
      .select()
      .single();

    if (insertError) {
      return err(insertError.message);
    }

    return ok(inserted as UserProfile);
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
      return err('You must be signed in to update your profile');
    }

    const updatePayload = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await supabase
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', user.id)
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
