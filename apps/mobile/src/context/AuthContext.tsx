import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@workspace/supabase';
import { supabase } from '../../lib/supabase';
import { fetchUserProfile, isSuperAdminEmail, signInWithEmail, signUpWithEmail, signOutUser } from '../services/auth.service';
import type { AuthContextType } from '../types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  async function loadUserData(userId: string, email: string) {
    try {
      const isSuper = isSuperAdminEmail(email);
      const prof = await fetchUserProfile(userId);

      if (prof) {
        setProfile(prof);
        setIsAdmin(prof.role === 'admin' || isSuper);
      } else {
        setProfile(null);
        setIsAdmin(isSuper);
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id, session.user.email || '').finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadUserData(newSession.user.id, newSession.user.email || '');
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, pass: string) {
    try {
      setLoading(true);
      const { data, error } = await signInWithEmail(email, pass);
      if (error) return { error };
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, pass: string, fullName: string) {
    try {
      setLoading(true);
      const { data, error } = await signUpWithEmail(email, pass, fullName);
      if (error) return { error };
      const needsEmailConfirmation = !data.session;
      return { error: null, needsEmailConfirmation };
    } catch (err: any) {
      return { error: err };
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      setLoading(true);
      await signOutUser();
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadUserData(user.id, user.email || '');
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
