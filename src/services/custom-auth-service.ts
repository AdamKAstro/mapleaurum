// src/services/custom-auth-service.ts
import { supabase } from '../lib/supabaseClient';
import { AuthError, AuthResponse, UserResponse, Session } from '@supabase/supabase-js';

/**
 * Debug configuration
 */
const DEBUG_CONFIG = {
  enabled: true,
  logResponses: true,
  logErrors: true,
  logSessionDetails: true,
  logSupabaseConfig: true
};

/**
 * Debug logger
 */
class DebugLogger {
  private static prefix = '[AuthService]';
  
  static log(method: string, message: string, data?: any) {
    if (!DEBUG_CONFIG.enabled) return;
    
    const timestamp = new Date().toISOString();
    console.group(`${this.prefix} ${method} - ${timestamp}`);
    console.log(message);
    if (data) {
      console.log('Data:', data);
    }
    console.groupEnd();
  }
  
  static error(method: string, message: string, error: any) {
    if (!DEBUG_CONFIG.logErrors) return;
    
    const timestamp = new Date().toISOString();
    console.group(`${this.prefix} ERROR in ${method} - ${timestamp}`);
    console.error(message);
    console.error('Error object:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status,
      statusCode: error?.statusCode,
      __isAuthError: error?.__isAuthError
    });
    console.groupEnd();
  }
  
  static response(method: string, response: any) {
    if (!DEBUG_CONFIG.logResponses) return;
    
    console.group(`${this.prefix} Response from ${method}`);
    console.log('Full response:', response);
    console.groupEnd();
  }
  
  static supabaseConfig() {
    if (!DEBUG_CONFIG.logSupabaseConfig) return;
    
    console.group(`${this.prefix} Supabase Configuration`);
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Auth URL:', supabase.auth);
    console.log('Has Anon Key:', !!supabase.supabaseKey);
    console.groupEnd();
  }
}

/**
 * Defines the standardized response structure for all auth service methods.
 */
interface AuthServiceResponse<T = any> {
  success: boolean;
  data: T | null;
  error: AuthError | null;
  message: string;
  metadata?: Record<string, any>;
  debug?: {
    timestamp: string;
    method: string;
    duration: number;
    supabaseResponse?: any;
  };
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
  EMAIL_SENDING_FAILED = 'EMAIL_SENDING_FAILED',
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
 */
export class CustomAuthService {
  // Configuration
  private static readonly PASSWORD_RULES: PasswordValidation = {
    minLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  };

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly RATE_LIMIT_PATTERNS = ['rate limit', 'too many requests', 'exceeded'];

  /**
   * Initialize and log configuration
   */
  static {
    DebugLogger.supabaseConfig();
  }

  /**
   * Validates email format
   */
  private static validateEmail(email: string): { isValid: boolean; cleanEmail: string; message?: string } {
    const cleanEmail = email.trim().toLowerCase();
    
    DebugLogger.log('validateEmail', 'Validating email', { 
      original: email, 
      cleaned: cleanEmail 
    });
    
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
      return { 
        isValid: false, 
        cleanEmail, 
        message: `Did you mean ${domain.replace('gmial', 'gmail').replace('gmai', 'gmail').replace('yahooo', 'yahoo').replace('hotmial', 'hotmail')}?` 
      };
    }
    
    return { isValid: true, cleanEmail };
  }


/**
   * Validates password strength
   */
  static validatePassword(password: string): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    DebugLogger.log('validatePassword', 'Validating password', { length: password.length });

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
    
    DebugLogger.log('validatePassword', 'Password validation result', {
      isValid,
      score,
      feedback
    });
    
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
   * Analyzes error to determine type
   */
  private static analyzeError(error: any): { code: AuthErrorCode; isEmailError: boolean } {
    const message = error?.message?.toLowerCase() || '';
    const errorStr = JSON.stringify(error).toLowerCase();
    
    DebugLogger.log('analyzeError', 'Analyzing error', {
      message,
      hasMessage: !!error?.message,
      errorType: error?.constructor?.name,
      errorKeys: error ? Object.keys(error) : []
    });
    
    // Check for email sending errors
    const emailErrorPatterns = [
      'error sending',
      'email.*failed',
      'smtp',
      'sendgrid',
      'resend',
      'mail.*error',
      'could not send',
      'email service',
      'email provider'
    ];
    
    const isEmailError = emailErrorPatterns.some(pattern => 
      new RegExp(pattern).test(message) || new RegExp(pattern).test(errorStr)
    );
    
    if (isEmailError) {
      return { code: AuthErrorCode.EMAIL_SENDING_FAILED, isEmailError: true };
    }
    
    if (message.includes('already registered')) {
      return { code: AuthErrorCode.ALREADY_REGISTERED, isEmailError: false };
    }
    if (message.includes('rate limit')) {
      return { code: AuthErrorCode.RATE_LIMITED, isEmailError: false };
    }
    if (message.includes('invalid') && message.includes('session')) {
      return { code: AuthErrorCode.INVALID_SESSION, isEmailError: false };
    }
    if (message.includes('network')) {
      return { code: AuthErrorCode.NETWORK_ERROR, isEmailError: false };
    }
    if (message.includes('weak password')) {
      return { code: AuthErrorCode.WEAK_PASSWORD, isEmailError: false };
    }
    if (message.includes('not confirmed')) {
      return { code: AuthErrorCode.EMAIL_NOT_CONFIRMED, isEmailError: false };
    }
    
    return { code: AuthErrorCode.UNKNOWN_ERROR, isEmailError: false };
  }

  /**
   * Signs up a new user and handles the confirmation email flow.
   */
  static async signUpWithEmail(email: string, password: string): Promise<AuthServiceResponse<AuthResponse['data']>> {
    const startTime = Date.now();
    const debugData = {
      timestamp: new Date().toISOString(),
      method: 'signUpWithEmail',
      duration: 0,
      supabaseResponse: null as any
    };

    try {
      // Validate email
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        DebugLogger.log('signUpWithEmail', 'Email validation failed', emailValidation);
        return {
          success: false,
          data: null,
          error: new AuthError(emailValidation.message || 'Invalid email'),
          message: emailValidation.message || 'Please provide a valid email address.',
          metadata: { errorCode: AuthErrorCode.VALIDATION_FAILED },
          debug: debugData
        };
      }

      // Validate password
      const passwordValidation = this.validatePassword(password);
      if (!passwordValidation.isValid) {
        DebugLogger.log('signUpWithEmail', 'Password validation failed', passwordValidation);
        return {
          success: false,
          data: null,
          error: new AuthError('Weak password'),
          message: passwordValidation.feedback.join(' '),
          metadata: { 
            errorCode: AuthErrorCode.WEAK_PASSWORD,
            passwordScore: passwordValidation.score,
            passwordFeedback: passwordValidation.feedback
          },
          debug: debugData
        };
      }

      DebugLogger.log('signUpWithEmail', 'Attempting Supabase signup', {
        email: emailValidation.cleanEmail,
        redirectTo: `${window.location.origin}/companies`
      });

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

      debugData.supabaseResponse = { data, error };
      debugData.duration = Date.now() - startTime;

      if (error) {
        DebugLogger.error('signUpWithEmail', 'Supabase signup error', error);
        const { code } = this.analyzeError(error);
        
        let message = error.message;
        if (code === AuthErrorCode.ALREADY_REGISTERED) {
          message = 'This email is already registered. Please sign in instead.';
        } else if (code === AuthErrorCode.RATE_LIMITED) {
          message = 'Too many signup attempts. Please try again in a few minutes.';
        }

        return { 
          success: false, 
          data: null, 
          error, 
          message,
          metadata: { errorCode: code },
          debug: debugData
        };
      }

      if (!data.user) {
        DebugLogger.error('signUpWithEmail', 'No user object returned', data);
        return { 
          success: false, 
          data: null, 
          error: new AuthError('User object was not returned after sign up.'), 
          message: 'An unexpected error occurred. Could not create user.',
          metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR },
          debug: debugData
        };
      }

      const requiresConfirmation = !!data.user && !data.user.email_confirmed_at;
      const message = requiresConfirmation
        ? 'Account created! Please check your email to click the confirmation link.'
        : 'Account created successfully!';
        
      DebugLogger.log('signUpWithEmail', 'Signup successful', {
        requiresConfirmation,
        userId: data.user.id
      });

      return { 
        success: true, 
        data, 
        error: null, 
        message,
        metadata: {
          requiresEmailConfirmation: requiresConfirmation,
          userId: data.user.id,
          passwordScore: passwordValidation.score
        },
        debug: DEBUG_CONFIG.enabled ? debugData : undefined
      };

    } catch (e: unknown) {
      debugData.duration = Date.now() - startTime;
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred during signup.');
      DebugLogger.error('signUpWithEmail', 'Unexpected error during signup', e);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR },
        debug: debugData
      };
    }
  }

  /**
   * Requests a password reset link from Supabase.
   */
  static async requestPasswordReset(email: string): Promise<AuthServiceResponse<{}>> {
    const startTime = Date.now();
    const debugData = {
      timestamp: new Date().toISOString(),
      method: 'requestPasswordReset',
      duration: 0,
      supabaseResponse: null as any
    };

    try {
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        DebugLogger.log('requestPasswordReset', 'Email validation failed', emailValidation);
        return { 
          success: false, 
          data: null, 
          error: new AuthError('Invalid email'), 
          message: emailValidation.message || 'Please enter a valid email address.',
          metadata: { errorCode: AuthErrorCode.VALIDATION_FAILED },
          debug: debugData
        };
      }

      DebugLogger.log('requestPasswordReset', 'Starting password reset request', {
        email: emailValidation.cleanEmail,
        supabaseUrl: supabase.supabaseUrl,
        redirectTo: `${window.location.origin}/reset-password`
      });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      DebugLogger.log('requestPasswordReset', 'Current session state', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });

      const redirectTo: "https://mapleaurum.com/reset-password";
	  console.log('[DEBUG] Password reset redirect URL:', redirectTo); // Add this line
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        emailValidation.cleanEmail, 
        { redirectTo }
      );

      debugData.supabaseResponse = { data, error };
      debugData.duration = Date.now() - startTime;

      if (error) {
        DebugLogger.error('requestPasswordReset', 'Supabase password reset error', error);
        
        const { code, isEmailError } = this.analyzeError(error);
        
        if (isEmailError) {
          DebugLogger.log('requestPasswordReset', 'Email sending error detected', {
            errorCode: code,
            supabaseAuthConfig: {
              hasEmailProvider: 'Check Supabase Dashboard > Authentication > Providers',
              emailTemplates: 'Check Supabase Dashboard > Authentication > Email Templates',
              smtpSettings: 'Check Supabase Dashboard > Authentication > SMTP Settings'
            },
            possibleCauses: [
              'Email provider not configured in Supabase',
              'SMTP settings incorrect',
              'Email template issues',
              'Rate limiting from email provider',
              'Domain not verified'
            ]
          });
          return {
            success: true,
            data: {},
            error: null,
            message: 'If an account exists for this email, a password reset link will be sent.',
            metadata: { 
              errorCode: code,
              actualError: error.message,
              emailSendingFailed: true
            },
            debug: debugData
          };
        }
        
        if (code === AuthErrorCode.RATE_LIMITED) {
          return { 
            success: false, 
            data: null, 
            error, 
            message: 'Too many password reset attempts. Please try again in a few minutes.',
            metadata: { errorCode: code, rateLimited: true },
            debug: debugData
          };
        }

        return {
          success: true,
          data: {},
          error: null,
          message: 'If an account exists for this email, a password reset link will be sent.',
          metadata: { errorCode: code },
          debug: debugData
        };
      }

      DebugLogger.log('requestPasswordReset', 'Password reset request successful', {
        duration: debugData.duration,
        response: data
      });

      return {
        success: true,
        data: {},
        error: null,
        message: 'If an account exists for this email, a password reset link has been sent.',
        metadata: { 
          email: emailValidation.cleanEmail,
          timestamp: new Date().toISOString()
        },
        debug: DEBUG_CONFIG.enabled ? debugData : undefined
      };

    } catch (e: unknown) {
      debugData.duration = Date.now() - startTime;
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred');
      DebugLogger.error('requestPasswordReset', 'Unexpected error during password reset', e);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { 
          errorCode: AuthErrorCode.UNKNOWN_ERROR,
          errorDetails: e instanceof Error ? e.message : 'Unknown error'
        },
        debug: debugData
      };
    }
  }

  /**
   * Checks if the current session is a valid recovery session
   */
  static async isValidRecoverySession(): Promise<{ isValid: boolean; session: Session | null }> {
    const debugData = {
      timestamp: new Date().toISOString(),
      method: 'isValidRecoverySession',
      duration: 0
    };
    const startTime = Date.now();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      DebugLogger.log('isValidRecoverySession', 'Session check', {
        hasSession: !!session,
        userId: session?.user?.id,
        recoverySentAt: session?.user?.recovery_sent_at,
        aud: session?.user?.aud
      });

      debugData.duration = Date.now() - startTime;

      if (!session) {
        DebugLogger.log('isValidRecoverySession', 'No session found', debugData);
        return { isValid: false, session: null };
      }

      const isRecovery = session.user?.aud === 'authenticated' && 
                        (session.user?.recovery_sent_at || 
                         session.access_token.includes('recovery'));
      
      DebugLogger.log('isValidRecoverySession', 'Recovery session check result', {
        isRecovery,
        debug: debugData
      });

      return { isValid: isRecovery, session };
    } catch (error) {
      debugData.duration = Date.now() - startTime;
      DebugLogger.error('isValidRecoverySession', 'Error checking recovery session', error);
      return { isValid: false, session: null };
    }
  }

  /**
   * Updates the password for the user in a password recovery session.
   */
  static async updateUserPassword(newPassword: string): Promise<AuthServiceResponse<UserResponse['data']>> {
    const startTime = Date.now();
    const debugData = {
      timestamp: new Date().toISOString(),
      method: 'updateUserPassword',
      duration: 0,
      supabaseResponse: null as any
    };

    try {
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        DebugLogger.log('updateUserPassword', 'Password validation failed', passwordValidation);
        return { 
          success: false, 
          data: null, 
          error: new AuthError('Weak password'), 
          message: passwordValidation.feedback.join(' '),
          metadata: { 
            errorCode: AuthErrorCode.WEAK_PASSWORD,
            passwordScore: passwordValidation.score,
            passwordFeedback: passwordValidation.feedback
          },
          debug: debugData
        };
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      DebugLogger.log('updateUserPassword', 'Session check', {
        hasSession: !!session,
        sessionError: sessionError?.message,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionType: session?.user?.app_metadata,
        aud: session?.user?.aud,
        role: session?.user?.role
      });

      if (!session) {
        DebugLogger.error('updateUserPassword', 'No active session', sessionError);
        return { 
          success: false, 
          data: null, 
          error: new AuthError('No active session'), 
          message: 'Invalid or expired reset link. Please request a new one.',
          metadata: { errorCode: AuthErrorCode.INVALID_SESSION },
          debug: debugData
        };
      }

      DebugLogger.log('updateUserPassword', 'Attempting password update', { userId: session.user.id });
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      
      debugData.supabaseResponse = { data, error };
      debugData.duration = Date.now() - startTime;

      if (error) {
        DebugLogger.error('updateUserPassword', 'Password update failed', error);
        const { code } = this.analyzeError(error);
        
        let message = 'Failed to update password. Please try again.';
        if (code === AuthErrorCode.WEAK_PASSWORD) {
          message = 'Password does not meet security requirements.';
        } else if (code === AuthErrorCode.RATE_LIMITED) {
          message = 'Too many attempts. Please try again later.';
        }

        return { 
          success: false, 
          data: null, 
          error, 
          message,
          metadata: { errorCode: code },
          debug: debugData
        };
      }

      DebugLogger.log('updateUserPassword', 'Password updated, signing out', { userId: session.user.id });
      await supabase.auth.signOut();
      
      return { 
        success: true, 
        data, 
        error: null, 
        message: 'Password updated successfully! You can now sign in with your new password.',
        metadata: {
          passwordScore: passwordValidation.score,
          timestamp: new Date().toISOString()
        },
        debug: DEBUG_CONFIG.enabled ? debugData : undefined
      };

    } catch (e: unknown) {
      debugData.duration = Date.now() - startTime;
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred');
      DebugLogger.error('updateUserPassword', 'Unexpected error during password update', e);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR },
        debug: debugData
      };
    }
  }

  /**
   * Resends the confirmation email to a user who has not yet confirmed their account.
   */
  static async resendConfirmationEmail(email: string): Promise<AuthServiceResponse<{}>> {
    const startTime = Date.now();
    const debugData = {
      timestamp: new Date().toISOString(),
      method: 'resendConfirmationEmail',
      duration: 0,
      supabaseResponse: null as any
    };

    try {
      const emailValidation = this.validateEmail(email);
      if (!emailValidation.isValid) {
        DebugLogger.log('resendConfirmationEmail', 'Email validation failed', emailValidation);
        return { 
          success: false, 
          data: null, 
          error: new AuthError('Invalid email'), 
          message: emailValidation.message || 'Please enter a valid email address.',
          metadata: { errorCode: AuthErrorCode.VALIDATION_FAILED },
          debug: debugData
        };
      }

      DebugLogger.log('resendConfirmationEmail', 'Resending confirmation email', {
        email: emailValidation.cleanEmail,
        redirectTo: `${window.location.origin}/companies`
      });

      const redirectTo = `${window.location.origin}/companies`;
      const { error } = await supabase.auth.resend({ 
        type: 'signup', 
        email: emailValidation.cleanEmail, 
        options: { emailRedirectTo: redirectTo } 
      });

      debugData.supabaseResponse = { error };
      debugData.duration = Date.now() - startTime;

      if (error) {
        DebugLogger.error('resendConfirmationEmail', 'Resend confirmation error', error);
        const { code } = this.analyzeError(error);
        
        if (code === AuthErrorCode.RATE_LIMITED) {
          return { 
            success: false, 
            data: null, 
            error, 
            message: 'Too many attempts. Please wait a few minutes before trying again.',
            metadata: { errorCode: code, rateLimited: true },
            debug: debugData
          };
        }
        
        if (error.message.toLowerCase().includes('already confirmed')) {
          return { 
            success: false, 
            data: null, 
            error, 
            message: 'This email address has already been confirmed. Please sign in.',
            metadata: { errorCode: AuthErrorCode.EMAIL_NOT_CONFIRMED },
            debug: debugData
          };
        }
        
        return { 
          success: false, 
          data: null, 
          error, 
          message: 'Failed to resend confirmation email. Please try again later.',
          metadata: { errorCode: code },
          debug: debugData
        };
      }
      
      DebugLogger.log('resendConfirmationEmail', 'Confirmation email resent', {
        email: emailValidation.cleanEmail,
        duration: debugData.duration
      });

      return { 
        success: true, 
        data: {}, 
        error: null, 
        message: 'Confirmation email has been resent. Please check your inbox (and spam folder).',
        metadata: {
          email: emailValidation.cleanEmail,
          timestamp: new Date().toISOString()
        },
        debug: DEBUG_CONFIG.enabled ? debugData : undefined
      };

    } catch (e: unknown) {
      debugData.duration = Date.now() - startTime;
      const error = e instanceof AuthError ? e : new AuthError('An unexpected error occurred');
      DebugLogger.error('resendConfirmationEmail', 'Unexpected error during confirmation resend', e);
      return { 
        success: false, 
        data: null, 
        error, 
        message: 'A critical error occurred. Please try again later.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR },
        debug: debugData
      };
    }
  }

  /**
   * Gets the current authentication session
   */
  static async getCurrentSession(): Promise<AuthServiceResponse<Session>> {
    const startTime = Date.now();
    const debugData = {
      timestamp: new Date().toISOString(),
      method: 'getCurrentSession',
      duration: 0,
      supabaseResponse: null as any
    };

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      debugData.supabaseResponse = { session, error };
      debugData.duration = Date.now() - startTime;

      if (error) {
        DebugLogger.error('getCurrentSession', 'Failed to get session', error);
        return {
          success: false,
          data: null,
          error,
          message: 'Failed to get current session.',
          metadata: { errorCode: this.analyzeError(error).code },
          debug: debugData
        };
      }

      if (!session) {
        DebugLogger.log('getCurrentSession', 'No active session found', debugData);
        return {
          success: false,
          data: null,
          error: new AuthError('No active session'),
          message: 'No active session found.',
          metadata: { errorCode: AuthErrorCode.INVALID_SESSION },
          debug: debugData
        };
      }

      DebugLogger.log('getCurrentSession', 'Session retrieved', {
        userId: session.user.id,
        email: session.user.email,
        duration: debugData.duration
      });

      return {
        success: true,
        data: session,
        error: null,
        message: 'Session retrieved successfully.',
        metadata: {
          userId: session.user.id,
          email: session.user.email,
          isRecoverySession: !!session.user.recovery_sent_at
        },
        debug: DEBUG_CONFIG.enabled ? debugData : undefined
      };
    } catch (e: unknown) {
      debugData.duration = Date.now() - startTime;
      const error = e instanceof AuthError ? e : new AuthError('Failed to get session');
      DebugLogger.error('getCurrentSession', 'Unexpected error during session retrieval', e);
      return {
        success: false,
        data: null,
        error,
        message: 'Failed to retrieve session.',
        metadata: { errorCode: AuthErrorCode.UNKNOWN_ERROR },
        debug: debugData
      };
    }
  }

  /**
   * Debug helper to check Supabase configuration
   */
  static async debugSupabaseEmailConfig(): Promise<void> {
    console.group('[AuthService] Supabase Email Configuration Debug');
    
    try {
      DebugLogger.log('debugSupabaseEmailConfig', 'Testing Supabase auth methods');
      console.log('resetPasswordForEmail available:', typeof supabase.auth.resetPasswordForEmail === 'function');
      console.log('signUp available:', typeof supabase.auth.signUp === 'function');
      console.log('updateUser available:', typeof supabase.auth.updateUser === 'function');
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'Active' : 'None');
      
      const { error: pingError } = await supabase.from('profiles').select('count').limit(1);
      console.log('Database connection:', pingError ? `Error: ${pingError.message}` : 'OK');
      
    } catch (error) {
      DebugLogger.error('debugSupabaseEmailConfig', 'Debug check failed', error);
    }
    
    console.groupEnd();
  }
}