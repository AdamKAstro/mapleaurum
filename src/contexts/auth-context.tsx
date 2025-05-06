//src/contexts/auth-context.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User, AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient'; // Your initialized Supabase client

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean; // Indicates if session is being loaded initially
  error: AuthError | null;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: AuthError | null }>;
  // signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: AuthError | null }>; // Optional: Add if needed
  signOut: () => Promise<{ error: AuthError | null }>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until first check is done
  const [error, setError] = useState<AuthError | null>(null);

  // Effect to check initial session and listen for changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Check current session syncronously if possible (useful on initial load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      console.log('[AuthContext] Initial session:', session);
    }).catch(err => {
        console.error("[AuthContext] Error getting initial session:", err);
        setIsLoading(false);
    });


    // Listen for auth state changes (login, logout, token refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`[AuthContext] Auth state changed: ${_event}`, session);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false); // Ensure loading is false after state change
        setError(null); // Clear errors on successful auth change
      }
    );

    // Cleanup function
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signIn = useCallback(async (credentials: SignInWithPasswordCredentials) => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
        console.error('[AuthContext] Sign in error:', error);
        setError(error);
    } else {
        // Session state will be updated by onAuthStateChange listener
    }
    setIsLoading(false);
    return { error };
  }, []);

  /* Optional Sign Up Function
  const signUp = useCallback(async (credentials: SignUpWithPasswordCredentials) => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp(credentials);
     if (error) {
        console.error('[AuthContext] Sign up error:', error);
        setError(error);
    } else {
        // User might need email confirmation depending on your Supabase settings
        console.log('[AuthContext] Sign up successful, check email if confirmation required.');
    }
    setIsLoading(false);
    return { error };
  }, []);
  */

  // Sign out function
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signOut();
     if (error) {
        console.error('[AuthContext] Sign out error:', error);
        setError(error);
    } else {
         // Session state will be updated by onAuthStateChange listener
    }
    // Don't set loading false immediately, wait for onAuthStateChange
    // setIsLoading(false); // Let the listener handle setting loading false
    return { error };
  }, []);

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    error,
    signIn,
    // signUp, // Optional
    signOut,
  };

  // Render children only after initial load attempt, or show a loader
  // return <AuthContext.Provider value={value}>{!isLoading ? children : <div>Loading Auth...</div>}</AuthContext.Provider>;
  // OR just provide value immediately and let consumers handle loading state:
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