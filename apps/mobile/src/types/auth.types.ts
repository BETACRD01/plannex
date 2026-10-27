import type { Profile } from '@workspace/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'customer';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
