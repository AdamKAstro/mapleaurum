// src/contexts/auth-context.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

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
  }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
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

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get initial session
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

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Auth state changed: ${event}`, session?.user?.id);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Clear errors on successful auth events
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setError(null);
          }
          
          // Handle specific events
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

  // Enhanced sign in with better error handling
  const signIn = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      
      if (error) {
        console.error('[AuthContext] Sign in error:', error);
        setError(error);
        
        // Provide more specific error messages
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

  // Enhanced sign up with email confirmation handling
  const signUp = useCallback(async (credentials: SignUpWithPasswordCredentials & { emailRedirectTo?: string }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { emailRedirectTo, ...signUpCredentials } = credentials;
      
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
        console.error('[AuthContext] Sign up error:', error);
        setError(error);
        
        // Handle specific error cases
        if (error.message.includes('already registered')) {
          error.message = 'This email is already registered. Please sign in or reset your password.';
        }
        
        return { error, requiresEmailConfirmation: false, user: null };
      }
      
      // Check if email confirmation is required
      const requiresEmailConfirmation = data.user && !data.user.confirmed_at && !data.session;
      
      if (requiresEmailConfirmation) {
        console.log('[AuthContext] Email confirmation required for:', data.user?.email);
      } else if (data.session) {
        console.log('[AuthContext] User auto-confirmed and signed in:', data.user?.id);
      }
      
      return { 
        error: null, 
        requiresEmailConfirmation,
        user: data.user 
      };
    } catch (err) {
      console.error('[AuthContext] Unexpected sign up error:', err);
      const authError = err as AuthError;
      setError(authError);
      return { error: authError, requiresEmailConfirmation: false, user: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resend confirmation email
  const resendConfirmationEmail = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/login?message=confirm_email`
        }
      });
      
      if (error) {
        console.error('[AuthContext] Resend confirmation error:', error);
        return { error };
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

  // Reset password
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

  // Update password (for already authenticated users)
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

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AuthContext] Sign out error:', error);
        setError(error);
      } else {
        // Clear any cached data
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

  // Clear error
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
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}