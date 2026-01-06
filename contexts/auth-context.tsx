import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { router } from 'expo-router';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{
    error: Error | null;
    requiresEmailConfirmation?: boolean;
    email?: string;
    userId?: string;
  }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null; requiresConfirmation?: boolean }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'fgmobile://auth/callback',
          data: metadata,
        },
      });

      if (error) {
        return { error };
      }

      // If session returned, user is auto-confirmed
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        return {
          error: null,
          userId: data.session.user.id
        };
      }

      // No session means email confirmation is required
      // Return a special indicator that email confirmation is needed
      if (data.user && !data.session) {
        console.log('Email confirmation required for:', data.user.email);
        return {
          error: null,
          requiresEmailConfirmation: true,
          email: data.user.email,
          userId: data.user.id
        };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear local state immediately
    setSession(null);
    setUser(null);
    router.replace('/login');
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        return { error };
      }

      // Email change typically requires confirmation
      return { error: null, requiresConfirmation: true };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteAccount = async () => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      // Delete user data from users table first
      const { error: deleteDataError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteDataError) {
        console.error('Error deleting user data:', deleteDataError);
        // Continue with auth deletion even if profile deletion fails
      }

      // Delete the auth user - this requires a server-side function
      // For now, we'll sign out the user and they can contact support
      // In production, you'd use a Supabase Edge Function to delete the auth user
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      router.replace('/login');

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updatePassword,
    updateEmail,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
