// src/contexts/auth-context.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { CustomAuthService } from '../services/custom-auth-service.ts'; // Added .ts extension

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: AuthError | null }>;
  signUp: (credentials: SignUpWithPasswordCredentials & { emailRedirectTo?: string }) => Promise<{
    error: AuthError | null;
    requiresEmailConfirmation?: boolean;
    user?: User | null;
    emailSendingFailed?: boolean;
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>; // New function for Google sign-in
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Initialize auth state and subscribe to changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (mounted) {
          if (sessionError) {
            console.error("[AuthContext] Session initialization error:", sessionError);
            setError(sessionError);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
            console.log('[AuthContext] Initial session loaded:', session?.user?.id);
          }
        }
      } catch (err) {
        console.error("[AuthContext] Unexpected error during initialization:", err);
        if (mounted) {
          setError(err as AuthError);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Auth state changed: ${event}`, session?.user?.id);
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setError(null);
          }
          if (event === 'USER_UPDATED') {
            console.log('[AuthContext] User data updated');
          } else if (event === 'PASSWORD_RECOVERY') {
            console.log('[AuthContext] Password recovery initiated');
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        setError(error);
        if (error.message.includes('Email not confirmed')) {
          error.message = 'Please confirm your email before signing in. Check your inbox for the confirmation link.';
        }
      } else {
        console.log('[AuthContext] Sign in successful:', data.user?.id);
      }
      return { error };
    } catch (err) {
      console.error('[AuthContext] Unexpected sign in error:', err);
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpWithPasswordCredentials & { emailRedirectTo?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const { emailRedirectTo, ...signUpCredentials } = credentials;
      const customResult = await CustomAuthService.signUpWithEmail(
        signUpCredentials.email,
        signUpCredentials.password
      );
      if (customResult.error) {
        console.error('[AuthContext] Custom signup error:', customResult.error);
        const authError = customResult.error as AuthError;
        setError(authError);
        if (customResult.user && authError.message.includes('confirmation email failed')) {
          return {
            error: null,
            requiresEmailConfirmation: true,
            user: customResult.user,
            emailSendingFailed: true
          };
        }
        return {
          error: authError,
          requiresEmailConfirmation: false,
          user: null,
          emailSendingFailed: false
        };
      }
      const { data, error } = await supabase.auth.signUp({
        ...signUpCredentials,
        options: {
          emailRedirectTo: emailRedirectTo || `${window.location.origin}/login?message=confirm_email`,
          data: {
            email: signUpCredentials.email,
            signup_timestamp: new Date().toISOString(),
          }
        }
      });
      if (error) {
        console.error('[AuthContext] Supabase signup error:', error);
        setError(error);
        if (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('user already registered')) {
          error.message = 'This email is already registered. Please sign in or reset your password.';
        } else if (error.message.toLowerCase().includes('email') &&
                   error.message.toLowerCase().includes('sending')) {
          return {
            error: null,
            requiresEmailConfirmation: true,
            user: data?.user,
            emailSendingFailed: true
          };
        } else if (error.message.toLowerCase().includes('rate limit')) {
          error.message = 'Too many signup attempts. Please wait a few minutes and try again.';
        }
        return { error, requiresEmailConfirmation: false, user: null, emailSendingFailed: false };
      }
      const requiresEmailConfirmation = data.user && !data.user.confirmed_at && !data.session;
      if (requiresEmailConfirmation) {
        console.log('[AuthContext] Email confirmation required for:', data.user?.email);
      } else if (data.session) {
        console.log('[AuthContext] User auto-confirmed and signed in:', data.user?.id);
      }
      return {
        error: null,
        requiresEmailConfirmation: customResult.metadata?.requiresEmailConfirmation || requiresEmailConfirmation,
        user: customResult.data?.user || data.user,
        emailSendingFailed: customResult.metadata?.emailSendingFailed || false
      };
    } catch (err) {
      console.error('[AuthContext] Unexpected sign up error:', err);
      const authError = err as AuthError;
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        authError.message = 'Network error. Please check your connection and try again.';
      }
      setError(authError);
      return {
        error: authError,
        requiresEmailConfirmation: false,
        user: null,
        emailSendingFailed: false
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const customResult = await CustomAuthService.resendConfirmationEmail(email);
      if (customResult.error) {
        console.error('[AuthContext] Custom resend confirmation error:', customResult.error);
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/login?message=confirm_email`
          }
        });
        if (error) {
          console.error('[AuthContext] Supabase resend confirmation error:', error);
          return { error };
        }
      }
      console.log('[AuthContext] Confirmation email resent to:', email);
      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Unexpected resend error:', err);
      return { error: err as Error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        console.error('[AuthContext] Password reset error:', error);
        setError(error);
      }
      return { error };
    } catch (err) {
      console.error('[AuthContext] Unexpected password reset error:', err);
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) {
        console.error('[AuthContext] Password update error:', error);
        setError(error);
      }
      return { error };
    } catch (err) {
      console.error('[AuthContext] Unexpected password update error:', err);
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
        setError(error);
      } else {
        setSession(null);
        setUser(null);
      }
      return { error };
    } catch (err) {
      console.error('[AuthContext] Unexpected sign out error:', err);
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // NEW FUNCTION: Google Sign-in
  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
          scopes: 'email profile',
        },
      });
      if (error) {
        console.error('[AuthContext] Google sign in error:', error);
        setError(error);
        return { error };
      }
      console.log('[AuthContext] Initiating Google OAuth flow:', data);
      return { error: null };
    } catch (err) {
      console.error('[AuthContext] Unexpected Google sign in error:', err);
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    } finally {
      // The state will be updated by the onAuthStateChange listener after redirect
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    resendConfirmationEmail,
    resetPassword,
    updatePassword,
    signInWithGoogle, // Include the new function
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}