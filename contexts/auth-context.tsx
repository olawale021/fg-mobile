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
  verifyPassword: (password: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null; requiresConfirmation?: boolean }>;
  deleteAccount: (reason?: string) => Promise<{ error: Error | null }>;
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

  const verifyPassword = async (password: string) => {
    try {
      if (!user?.email) {
        return { error: new Error('No user email found') };
      }

      // Attempt to sign in with the current password to verify it
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        return { error: new Error('Current password is incorrect') };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
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

  const deleteAccount = async (reason?: string) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      // Call the delete-user edge function which has admin privileges
      const { data, error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: { reason: reason || 'No reason provided' }
      });

      if (deleteError) {
        console.error('Error deleting account:', deleteError);
        return { error: new Error(deleteError.message || 'Failed to delete account') };
      }

      if (data?.error) {
        console.error('Delete account error:', data.error);
        return { error: new Error(data.error) };
      }

      // Clear local state and redirect to login
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      router.replace('/login');

      return { error: null };
    } catch (error) {
      console.error('Delete account exception:', error);
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
    verifyPassword,
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
