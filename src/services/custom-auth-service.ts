// src/services/custom-auth-service.ts
import { supabase } from '../lib/supabaseClient';
import { AuthError, AuthResponse, UserResponse, Session } from '@supabase/supabase-js';

/**
 * Defines the standardized response structure for all auth service methods.
 * @property {boolean} success - True if the operation was successful, false otherwise.
 * @property {T | null} data - The data returned from Supabase on success.
 * @property {AuthError | null} error - The error object from Supabase on failure.
 * @property {string} message - A user-friendly message describing the result, suitable for display in UI alerts.
 * @property {Record<string, any>} metadata - Additional context-specific data
 */
interface AuthServiceResponse<T = any> {
  success: boolean;
  data: T | null;
  error: AuthError | null;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Error codes for better error handling
 */
enum AuthErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ALREADY_REGISTERED = 'ALREADY_REGISTERED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_SESSION = 'INVALID_SESSION',
  NETWORK_ERROR = 'NETWORK_ERROR',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Password validation rules
 */
interface PasswordValidation {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * A robust, full-featured service for handling Supabase authentication flows.
 * This service interprets Supabase responses to provide clear, user-friendly messages
 * and handles common edge cases and validation.
 */
export class CustomAuthService {
  // Configuration
  private static readonly PASSWORD_RULES: PasswordValidation = {
    minLength: 8,
    requireUppercase: false, // Set to true for stricter security
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  };

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly RATE_LIMIT_PATTERNS = ['rate limit', 'too many requests', 'exceeded'];

  /**
   * Validates email format
   */
  private static validateEmail(email: string): { isValid: boolean; cleanEmail: string; message?: string } {
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail) {
      return { isValid: false, cleanEmail: '', message: 'Email address is required.' };
    }
    
    if (!this.EMAIL_REGEX.test(cleanEmail)) {
      return { isValid: false, cleanEmail, message: 'Please enter a valid email address.' };
    }
    
    // Additional validation for common typos
    const commonTypos = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
    const domain = cleanEmail.split('@')[1];
    if (commonTypos.includes(domain)) {
      return { isValid: false, cleanEmail, message: `Did you mean ${domain.replace('gmial', 'gmail').replace('gmai', 'gmail').replace('yahooo', 'yahoo').replace('hotmial', 'hotmail')}?` };
    }
    
    return { isValid: true, cleanEmail };
  }

  /**
   * Validates password strength
   */
  static validatePassword(password: string): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < this.PASSWORD_RULES.minLength) {
      feedback.push(`Password must be at least ${this.PASSWORD_RULES.minLength} characters long.`);
    } else {
      score += 2;
      if (password.length >= 12) score += 1;
      if (password.length >= 16) score += 1;
    }

    // Character type validation
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);

    if (this.PASSWORD_RULES.requireLowercase && !hasLowercase) {
      feedback.push('Include at least one lowercase letter.');
    } else if (hasLowercase) score += 0.5;

    if (this.PASSWORD_RULES.requireUppercase && !hasUppercase) {
      feedback.push('Include at least one uppercase letter.');
    } else if (hasUppercase) score += 0.5;

    if (this.PASSWORD_RULES.requireNumbers && !hasNumbers) {
      feedback.push('Include at least one number.');
    } else if (hasNumbers) score += 0.5;

    if (this.PASSWORD_RULES.requireSpecialChars && !hasSpecialChars) {
      feedback.push('Include at least one special character.');
    } else if (hasSpecialChars) score += 0.5;

    // Common patterns check
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeating characters.');
      score -= 0.5;
    }

    // Common passwords check
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      feedback.push('Avoid common passwords.');
      score -= 1;
    }

    const isValid = password.length >= this.PASSWORD_RULES.minLength && feedback.length === 0;
    return { isValid, score: Math.max(0, Math.min(5, score)), feedback };
  }

  /**
   * Checks if error message indicates rate limiting
   */
  private static isRateLimitError(message: string): boolean {
    return this.RATE_LIMIT_PATTERNS.some(pattern => 
      message.toLowerCase().includes(pattern)
    );
  }

  /**
   * Extracts error code from error message
   */
  private static getErrorCode(error: AuthError): AuthErrorCode {
    const message = error.message.toLowerCase();
    
    if (message.includes('already registered')) return AuthErrorCode.ALREADY_REGISTERED;
    if (this.isRateLimitError(message)) return AuthErrorCode.RATE_LIMITED;
    if (message.includes('invalid') && message.includes('session')) return AuthErrorCode.INVALID_SESSION;
    if (message.includes('network')) return AuthErrorCode.NETWORK_ERROR;
    if (message.includes('weak password')) return AuthErrorCode.WEAK_PASSWORD;
    if (message.includes('not confirmed')) return AuthErrorCode.EMAIL_NOT_CONFIRMED;
    
    return AuthErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Signs up a new user and handles the confirmation email flow.
   */
  static async signUpWithEmail(email: string, password: string): Promise<AuthServiceResponse<AuthResponse['data']>> {
    try {
      // Validate email
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        return {
          success: false,
          data: null,
          error: new AuthError(emailValidation.message || 'Invalid email'),
          message: emailValidation.message || 'Please provide a valid email address.',
          metadata: { errorCode: AuthErrorCode.VALIDATION_FAILED }
        };
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          data: null,
          error: new AuthError('Weak password'),
          message: passwordValidation.feedback.join(' '),
          metadata: { 
            errorCode: AuthErrorCode.WEAK_PASSWORD,
            passwordScore: passwordValidation.score,
            passwordFeedback: passwordValidation.feedback
          }
        };
      }

      console.log('[AuthService] Attempting Supabase signup for:', emailValidation.cleanEmail);
      const redirectTo = `${window.location.origin}/companies`;

      const { data, error } = await supabase.auth.signUp({
        email: emailValidation.cleanEmail,
        password,
        options: { 
          emailRedirectTo: redirectTo,
          data: {
            signup_timestamp: new Date().toISOString(),
            signup_source: 'web',
            email_normalized: emailValidation.cleanEmail
          }
        },
      });

      if (error) {
        console.error('[AuthService] Signup error:', error.message);
        const errorCode = this.getErrorCode(error);
        
        let message = error.message;
        if (errorCode === AuthErrorCode.ALREADY_REGISTERED) {
          message = 'This email is already registered. Please sign in instead.';
        } else if (errorCode === AuthErrorCode.RATE_LIMITED) {
          message = 'Too many signup attempts. Please try again in a few minutes.';
        }

        return { 
          success: false, 
          data: null, 
          error, 
          message,
          metadata: { errorCode }
        };
      }

      if (!data.user) {
        return { 
          success: false, 
          data: null, 
          error: new AuthError('User object was not returned after sign up.'), 
          message: 'An unexpected error occurred. Could not create user.',
          metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR }
        };
      }

      // Determine if the user needs to confirm their email
      const requiresConfirmation = !!data.user && !data.user.email_confirmed_at;
      const message = requiresConfirmation
        ? 'Account created! Please check your email to click the confirmation link.'
        : 'Account created successfully!';
        
      return { 
        success: true, 
        data, 
        error: null, 
        message,
        metadata: {
          requiresEmailConfirmation: requiresConfirmation,
          userId: data.user.id,
          passwordScore: passwordValidation.score
        }
      };

    } catch (e: unknown) {
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred during signup.');
      console.error('[AuthService] Unexpected catch block error during signup:', error);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR }
      };
    }
  }

  /**
   * Requests a password reset link from Supabase.
   */
  static async requestPasswordReset(email: string): Promise<AuthServiceResponse<{}>> {
    try {
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        return { 
          success: false, 
          data: null, 
          error: new AuthError('Invalid email'), 
          message: emailValidation.message || 'Please enter a valid email address.',
          metadata: { errorCode: AuthErrorCode.VALIDATION_FAILED }
        };
      }

      console.log('[AuthService] Requesting password reset for:', emailValidation.cleanEmail);
      const redirectTo = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(
        emailValidation.cleanEmail, 
        { redirectTo }
      );

      // Handle specific, safe-to-display errors
      if (error) {
        console.error('[AuthService] Password reset request error:', error.message);
        const errorCode = this.getErrorCode(error);
        
        if (errorCode === AuthErrorCode.RATE_LIMITED) {
          return { 
            success: false, 
            data: null, 
            error, 
            message: 'Too many password reset attempts. Please try again in a few minutes.',
            metadata: { errorCode, rateLimited: true }
          };
        }
        // For all other errors, we don't return the error message to prevent leaking information
      }

      // Always return a generic success message for security (prevents email enumeration)
      return {
        success: true,
        data: {},
        error: null,
        message: 'If an account exists for this email, a password reset link has been sent.',
        metadata: { 
          email: emailValidation.cleanEmail,
          timestamp: new Date().toISOString()
        }
      };

    } catch (e: unknown) {
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred during password reset request.');
      console.error('[AuthService] Unexpected catch block error during password reset:', error);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR }
      };
    }
  }

  /**
   * Checks if the current session is a valid recovery session
   */
  static async isValidRecoverySession(): Promise<{ isValid: boolean; session: Session | null }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { isValid: false, session: null };
      }

      // Check if this is a recovery session by looking at the session's aal or amr
      const isRecovery = session.user?.aud === 'authenticated' && 
                        (session.user?.recovery_sent_at || 
                         session.access_token.includes('recovery'));
      
      return { isValid: isRecovery, session };
    } catch (error) {
      console.error('[AuthService] Error checking recovery session:', error);
      return { isValid: false, session: null };
    }
  }

  /**
   * Updates the password for the user in a password recovery session.
   */
  static async updateUserPassword(newPassword: string): Promise<AuthServiceResponse<UserResponse['data']>> {
    try {
      // Validate password
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return { 
          success: false, 
          data: null, 
          error: new AuthError('Weak password'), 
          message: passwordValidation.feedback.join(' '),
          metadata: { 
            errorCode: AuthErrorCode.WEAK_PASSWORD,
            passwordScore: passwordValidation.score,
            passwordFeedback: passwordValidation.feedback
          }
        };
      }

      // Verify the user is in a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { 
          success: false, 
          data: null, 
          error: new AuthError('No active session'), 
          message: 'Invalid or expired reset link. Please request a new one.',
          metadata: { errorCode: AuthErrorCode.INVALID_SESSION }
        };
      }

      console.log('[AuthService] Updating password for user:', session.user.id);
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error('[AuthService] Password update error:', error.message);
        const errorCode = this.getErrorCode(error);
        
        let message = 'Failed to update password. Please try again.';
        if (errorCode === AuthErrorCode.WEAK_PASSWORD) {
          message = 'Password does not meet security requirements.';
        } else if (errorCode === AuthErrorCode.RATE_LIMITED) {
          message = 'Too many attempts. Please try again later.';
        }

        return { 
          success: false, 
          data: null, 
          error, 
          message,
          metadata: { errorCode }
        };
      }

      // Log password change event
      console.log('[AuthService] Password updated successfully, signing out user');
      
      // On success, sign out to invalidate the recovery session and force a fresh login
      await supabase.auth.signOut();
      
      return { 
        success: true, 
        data, 
        error: null, 
        message: 'Password updated successfully! You can now sign in with your new password.',
        metadata: {
          passwordScore: passwordValidation.score,
          timestamp: new Date().toISOString()
        }
      };

    } catch (e: unknown) {
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred during password update.');
      console.error('[AuthService] Unexpected catch block error during password update:', error);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR }
      };
    }
  }
  
  /**
   * Resends the confirmation email to a user who has not yet confirmed their account.
   */
  static async resendConfirmationEmail(email: string): Promise<AuthServiceResponse<{}>> {
    try {
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        return { 
          success: false, 
          data: null, 
          error: new AuthError('Invalid email'), 
          message: emailValidation.message || 'Please enter a valid email address.',
          metadata: { errorCode: AuthErrorCode.VALIDATION_FAILED }
        };
      }

      console.log('[AuthService] Resending confirmation email for:', emailValidation.cleanEmail);
      const redirectTo = `${window.location.origin}/companies`;
      
      const { error } = await supabase.auth.resend({ 
        type: 'signup', 
        email: emailValidation.cleanEmail, 
        options: { emailRedirectTo: redirectTo } 
      });

      if (error) {
        console.error('[AuthService] Resend confirmation error:', error.message);
        const errorCode = this.getErrorCode(error);
        
        if (errorCode === AuthErrorCode.RATE_LIMITED) {
          return { 
            success: false, 
            data: null, 
            error, 
            message: 'Too many attempts. Please wait a few minutes before trying again.',
            metadata: { errorCode, rateLimited: true }
          };
        }
        
        if (error.message.toLowerCase().includes('already confirmed')) {
          return { 
            success: false, 
            data: null, 
            error, 
            message: 'This email address has already been confirmed. Please sign in.',
            metadata: { errorCode: AuthErrorCode.EMAIL_NOT_CONFIRMED }
          };
        }
        
        return { 
          success: false, 
          data: null, 
          error, 
          message: 'Failed to resend confirmation email. Please try again later.',
          metadata: { errorCode }
        };
      }
      
      return { 
        success: true, 
        data: {}, 
        error: null, 
        message: 'Confirmation email has been resent. Please check your inbox (and spam folder).',
        metadata: {
          email: emailValidation.cleanEmail,
          timestamp: new Date().toISOString()
        }
      };

    } catch (e: unknown) {
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred during confirmation resend.');
      console.error('[AuthService] Unexpected catch block error during resend:', error);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR }
      };
    }
  }

  /**
   * Gets the current authentication session
   */
  static async getCurrentSession(): Promise<AuthServiceResponse<Session>> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          success: false,
          data: null,
          error,
          message: 'Failed to get current session.',
          metadata: { errorCode: this.getErrorCode(error) }
        };
      }

      if (!session) {
        return {
          success: false,
          data: null,
          error: new AuthError('No active session'),
          message: 'No active session found.',
          metadata: { errorCode: AuthErrorCode.INVALID_SESSION }
        };
      }

      return {
        success: true,
        data: session,
        error: null,
        message: 'Session retrieved successfully.',
        metadata: {
          userId: session.user.id,
          email: session.user.email,
          isRecoverySession: !!session.user.recovery_sent_at
        }
      };
    } catch (e: unknown) {
      const error = e instanceof AuthError ? e : new AuthError('Failed to get session');
      return {
        success: false,
        data: null,
        error,
        message: 'Failed to retrieve session.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR }
      };
    }
  }
}