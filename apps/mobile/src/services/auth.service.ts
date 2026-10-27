import { supabase } from '../../lib/supabase';
import type { Profile } from '@workspace/supabase';

const SUPER_ADMIN_EMAILS = [
  'wd1501074@gmail.com',
  'williancerda0@gmail.com',
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Error fetching user profile:', error.message);
    return null;
  }
  return data;
}

export async function signInWithEmail(email: string, pass: string) {
  return await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: pass,
  });
}

export async function signUpWithEmail(email: string, pass: string, fullName: string) {
  return await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: pass,
    options: {
      data: {
        full_name: fullName.trim() || undefined,
      },
    },
  });
}

export async function signOutUser() {
  return await supabase.auth.signOut();
}
