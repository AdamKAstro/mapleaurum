// src/services/custom-auth-service.ts
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface SignUpResult {
  user: User | null;
  error: Error | null;
  requiresEmailConfirmation: boolean;
  confirmationToken?: string;
  emailSendingFailed?: boolean;
}

interface EmailConfirmationData {
  email: string;
  userId: string;
  token: string;
  expiresAt: string;
}

interface PasswordResetResult {
  success: boolean;
  error: Error | null;
  emailSendingFailed?: boolean;
  resetToken?: string;
}

interface PasswordResetData {
  email: string;
  userId: string;
  token: string;
  expiresAt: string;
  used: boolean;
}

/**
 * Custom auth service that uses SendGrid for email confirmations and password resets
 */
export class CustomAuthService {
  /**
   * Generate a secure confirmation token
   */
  private static generateConfirmationToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a secure password reset token
   */
  private static generateResetToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sign up a new user with custom email confirmation
   */
  static async signUpWithEmail(email: string, password: string): Promise<SignUpResult> {
    try {
      console.log('[CustomAuthService] Starting signup for:', email);

      // Step 1: First check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return {
          user: null,
          error: new Error('This email is already registered. Please sign in instead.'),
          requiresEmailConfirmation: false
        };
      }

      // Step 2: Create user with email confirmations COMPLETELY disabled
      // This is crucial - we need to disable ALL email sending from Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Critical: Set emailRedirectTo to empty string to disable Supabase emails
          emailRedirectTo: '',
          // Don't auto-confirm the email
          data: {
            email_confirmed_at: null,
            confirmation_sent_via: 'sendgrid',
            signup_timestamp: new Date().toISOString()
          }
        }
      });

      if (signUpError) {
        console.error('[CustomAuthService] Signup error:', signUpError);

        // Handle specific errors
        if (signUpError.message.includes('already registered')) {
          return {
            user: null,
            error: new Error('This email is already registered. Please sign in instead.'),
            requiresEmailConfirmation: false
          };
        }

        // If the error is about email sending, we can ignore it since we're handling emails ourselves
        if (signUpError.message.includes('Error sending confirmation email')) {
          console.log('[CustomAuthService] Ignoring Supabase email error, will use SendGrid');
          // Continue with the process if we have user data
          if (!signUpData?.user) {
            return {
              user: null,
              error: new Error('Failed to create user account'),
              requiresEmailConfirmation: false
            };
          }
        } else {
          // For other errors, return them
          return {
            user: null,
            error: signUpError,
            requiresEmailConfirmation: false
          };
        }
      }

      if (!signUpData?.user) {
        return {
          user: null,
          error: new Error('Failed to create user account'),
          requiresEmailConfirmation: false
        };
      }

      // Step 3: Generate confirmation token
      const confirmationToken = this.generateConfirmationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Step 4: Store confirmation token in database
      const { error: tokenError } = await supabase
        .from('email_confirmations')
        .insert({
          user_id: signUpData.user.id,
          email: email,
          token: confirmationToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      if (tokenError) {
        console.error('[CustomAuthService] Failed to store confirmation token:', tokenError);
        // Continue anyway - we can handle this in the resend flow
      }

      // Step 5: Send confirmation email via SendGrid
      const confirmationUrl = `${window.location.origin}/confirm-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`;

      let emailSendingFailed = false;
      let emailError: Error | null = null;

      try {
        const { error: sendError } = await this.sendConfirmationEmail(email, confirmationUrl, signUpData.user.id);
        if (sendError) {
          emailError = sendError;
          emailSendingFailed = true;
        }
      } catch (err) {
        console.error('[CustomAuthService] Failed to send confirmation email:', err);
        emailError = err as Error;
        emailSendingFailed = true;
      }

      // Always return success for account creation, but indicate if email failed
      console.log('[CustomAuthService] Signup successful, email sent:', !emailSendingFailed);
      return {
        user: signUpData.user,
        error: null,
        requiresEmailConfirmation: true,
        confirmationToken,
        emailSendingFailed
      };
    } catch (error) {
      console.error('[CustomAuthService] Unexpected error during signup:', error);
      return {
        user: null,
        error: error as Error,
        requiresEmailConfirmation: false
      };
    }
  }

  /**
   * Send confirmation email using SendGrid edge function
   */
  static async sendConfirmationEmail(email: string, confirmationUrl: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0e4166; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f4f4f4; padding: 20px; }
    .button { display: inline-block; padding: 12px 30px; margin: 20px 0; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 5px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to MapleAurum!</h1>
    </div>
    <div class="content">
      <h2>Confirm Your Email Address</h2>
      <p>Thank you for signing up! Please confirm your email address to activate your account and access all features.</p>
      <center>
        <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
      </center>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
        ${confirmationUrl}
      </p>
      <p><strong>This link will expire in 24 hours.</strong></p>
      <p>If you didn't create an account with MapleAurum, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MapleAurum. All rights reserved.</p>
      <p>Need help? Contact us at support@mapleaurum.com</p>
    </div>
  </div>
</body>
</html>
      `;

      // Call your edge function to send email
      const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
        body: {
          to: email,
          subject: 'Confirm your MapleAurum account',
          html: emailContent,
          userId: userId,
          type: 'email_confirmation'
        }
      });

      if (error) {
        console.error('[CustomAuthService] SendGrid error:', error);
        return { error };
      }

      if (!data || data.error) {
        console.error('[CustomAuthService] SendGrid returned error:', data);
        return { error: new Error(data?.error || 'Failed to send email') };
      }

      return { error: null };
    } catch (error) {
      console.error('[CustomAuthService] Failed to send email:', error);
      return { error: error as Error };
    }
  }

  /**
   * Resend confirmation email
   */
  static async resendConfirmationEmail(email: string): Promise<{ error: Error | null }> {
    try {
      // First, get the user from profiles (more reliable than auth.users)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email_confirmed')
        .eq('email', email)
        .single();

      if (profileError || !profile) {
        return { error: new Error('User not found. Please sign up first.') };
      }

      // Check if user already confirmed
      if (profile.email_confirmed) {
        return { error: new Error('Email already confirmed. Please sign in.') };
      }

      // Get or create new confirmation token
      const { data: existingToken } = await supabase
        .from('email_confirmations')
        .select('token, expires_at')
        .eq('user_id', profile.id)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let confirmationToken: string;

      if (existingToken && new Date(existingToken.expires_at) > new Date()) {
        // Use existing valid token
        confirmationToken = existingToken.token;
      } else {
        // Generate new token
        confirmationToken = this.generateConfirmationToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { error: insertError } = await supabase
          .from('email_confirmations')
          .insert({
            user_id: profile.id,
            email: email,
            token: confirmationToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('[CustomAuthService] Failed to create new token:', insertError);
          return { error: new Error('Failed to generate confirmation token') };
        }
      }

      // Send email
      const confirmationUrl = `${window.location.origin}/confirm-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`;
      return await this.sendConfirmationEmail(email, confirmationUrl, profile.id);
    } catch (error) {
      console.error('[CustomAuthService] Failed to resend confirmation:', error);
      return { error: error as Error };
    }
  }

  /**
   * Confirm email with token
   */
  static async confirmEmail(token: string, email: string): Promise<{ error: Error | null }> {
    try {
      // Verify token
      const { data: confirmationData, error: tokenError } = await supabase
        .from('email_confirmations')
        .select('user_id, expires_at, used')
        .eq('token', token)
        .eq('email', email)
        .single();

      if (tokenError || !confirmationData) {
        return { error: new Error('Invalid confirmation link') };
      }

      if (confirmationData.used) {
        return { error: new Error('This confirmation link has already been used') };
      }

      if (new Date(confirmationData.expires_at) < new Date()) {
        return { error: new Error('This confirmation link has expired. Please request a new one.') };
      }

      // Start a transaction to update both tables
      // Mark token as used
      const { error: updateTokenError } = await supabase
        .from('email_confirmations')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('token', token);

      if (updateTokenError) {
        console.error('[CustomAuthService] Failed to mark token as used:', updateTokenError);
      }

      // Update user profile to mark email as confirmed
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          email_confirmed: true,
          email_confirmed_at: new Date().toISOString()
        })
        .eq('id', confirmationData.user_id);

      if (updateProfileError) {
        console.error('[CustomAuthService] Failed to update profile:', updateProfileError);
        return { error: new Error('Failed to confirm email. Please contact support.') };
      }

      // Note: We can't directly update auth.users table from client-side
      // You'll need to handle this in a database trigger or edge function
      // For now, the email_confirmed flag in profiles table should be sufficient

      return { error: null };
    } catch (error) {
      console.error('[CustomAuthService] Failed to confirm email:', error);
      return { error: error as Error };
    }
  }

  /**
   * Request password reset - sends email via SendGrid (DEBUG VERSION)
   */
  static async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      console.log('[CustomAuthService] ========== PASSWORD RESET DEBUG START ==========');
      console.log('[CustomAuthService] Starting password reset for:', email);
      console.log('[CustomAuthService] Timestamp:', new Date().toISOString());

      // Step 1: Check if user exists in profiles table
      console.log('[CustomAuthService] Step 1: Checking profiles table...');

      // Try multiple approaches
      let profile = null;
      let profileError = null;

      // Approach 1: Try RPC function if it exists
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('debug_profile_access', { user_email: email });

        if (rpcData && rpcData.profile_found) {
          profile = rpcData.profile_data;
          console.log('[CustomAuthService] Found profile via RPC:', profile);
        }
      } catch (e) {
        console.log('[CustomAuthService] RPC function not available, trying direct query');
      }

      // Approach 2: Direct query with better error handling
      if (!profile) {
        const { data: profiles, error: queryError } = await supabase
          .from('profiles')
          .select('id, email, email_confirmed, created_at, updated_at')
          .eq('email', email)
          .limit(1);

        if (profiles && profiles.length > 0) {
          profile = profiles[0];
          console.log('[CustomAuthService] Found profile via direct query:', profile);
        } else {
          profileError = queryError;
          console.log('[CustomAuthService] Direct query failed:', queryError);
        }
      }

      // Approach 3: Try case-insensitive if exact match fails
      if (!profile) {
        const { data: profiles, error: ilikeError } = await supabase
          .from('profiles')
          .select('id, email, email_confirmed, created_at, updated_at')
          .ilike('email', email)
          .limit(1);

        if (profiles && profiles.length > 0) {
          profile = profiles[0];
          console.log('[CustomAuthService] Found profile via case-insensitive search:', profile);
        }
      }

      console.log('[CustomAuthService] Final profile result:', {
        found: !!profile,
        data: profile,
        error: profileError?.message || 'none'
      });

      if (!profile) {
        // Don't reveal if user exists for security
        console.log('[CustomAuthService] User not found, returning success for security');
        return {
          success: true,
          error: null
        };
      }

      // Step 2: Check if email is confirmed
      console.log('[CustomAuthService] Step 2: Checking email confirmation status...');
      if (!profile.email_confirmed) {
        console.log('[CustomAuthService] Email not confirmed, blocking password reset');
        return {
          success: false,
          error: new Error('Please confirm your email address before resetting your password.')
        };
      }

      // Step 3: Generate reset token
      console.log('[CustomAuthService] Step 3: Generating reset token...');
      const resetToken = this.generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry for password resets

      console.log('[CustomAuthService] Token generated:', {
        tokenLength: resetToken.length,
        tokenPreview: resetToken.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString()
      });

      // Step 4: Store reset token in database
      console.log('[CustomAuthService] Step 4: Storing reset token...');

      // First, check if password_resets table exists and has data
      const { data: existingResets, error: checkError } = await supabase
        .from('password_resets')
        .select('id, created_at')
        .limit(1);

      console.log('[CustomAuthService] Password resets table check:', {
        accessible: !checkError,
        error: checkError?.message,
        hasData: !!existingResets?.length
      });

      // Invalidate any existing unused tokens for this user
      console.log('[CustomAuthService] Invalidating existing tokens...');
      const { data: invalidated, error: invalidateError } = await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('user_id', profile.id)
        .eq('used', false)
        .select();

      console.log('[CustomAuthService] Invalidated tokens:', {
        count: invalidated?.length || 0,
        error: invalidateError?.message
      });

      // Insert new token
      console.log('[CustomAuthService] Inserting new reset token...');
      const { data: insertedToken, error: tokenError } = await supabase
        .from('password_resets')
        .insert({
          user_id: profile.id,
          email: email,
          token: resetToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          used: false
        })
        .select()
        .single();

      console.log('[CustomAuthService] Token insertion result:', {
        success: !tokenError,
        data: insertedToken ? { id: insertedToken.id, user_id: insertedToken.user_id } : null,
        error: tokenError ? {
          message: tokenError.message,
          code: tokenError.code,
          details: tokenError.details,
          hint: tokenError.hint
        } : null
      });

      if (tokenError) {
        console.error('[CustomAuthService] Failed to store reset token');
        return {
          success: false,
          error: new Error('Failed to generate reset token. Please try again.')
        };
      }

      // Step 5: Send reset email via SendGrid
      console.log('[CustomAuthService] Step 5: Preparing to send email...');
      const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      console.log('[CustomAuthService] Reset URL:', resetUrl);

      let emailSendingFailed = false;

      try {
        console.log('[CustomAuthService] Calling sendPasswordResetEmail...');
        const { error: sendError } = await this.sendPasswordResetEmail(email, resetUrl, profile.id);

        if (sendError) {
          emailSendingFailed = true;
          console.error('[CustomAuthService] SendGrid error:', {
            message: sendError.message,
            stack: sendError.stack
          });
        } else {
          console.log('[CustomAuthService] Email sent successfully!');
        }
      } catch (err: any) {
        console.error('[CustomAuthService] Exception while sending email:', {
          message: err.message,
          stack: err.stack,
          type: err.constructor.name
        });
        emailSendingFailed = true;
      }

      console.log('[CustomAuthService] Password reset process completed:', {
        success: true,
        emailSent: !emailSendingFailed,
        tokenStored: true
      });

      console.log('[CustomAuthService] ========== PASSWORD RESET DEBUG END ==========');

      return {
        success: true,
        error: null,
        emailSendingFailed,
        resetToken
      };
    } catch (error: any) {
      console.error('[CustomAuthService] ========== UNEXPECTED ERROR ==========');
      console.error('[CustomAuthService] Error type:', error.constructor.name);
      console.error('[CustomAuthService] Error message:', error.message);
      console.error('[CustomAuthService] Error stack:', error.stack);
      console.error('[CustomAuthService] Full error object:', error);

      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Send password reset email using SendGrid edge function
   */
  static async sendPasswordResetEmail(email: string, resetUrl: string, userId: string): Promise<{ error: Error | null }> {
    try {
      const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0e4166; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f4f4f4; padding: 20px; }
    .button { display: inline-block; padding: 12px 30px; margin: 20px 0; background-color: #17a2b8; color: white; text-decoration: none; border-radius: 5px; }
    .warning { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 10px; margin: 15px 0; border-radius: 4px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Reset Your MapleAurum Password</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
        ${resetUrl}
      </p>
      <div class="warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>This link will expire in 1 hour</li>
          <li>For security, this link can only be used once</li>
          <li>If you didn't request this reset, please ignore this email</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} MapleAurum. All rights reserved.</p>
      <p>Need help? Contact us at support@mapleaurum.com</p>
    </div>
  </div>
</body>
</html>
      `;

      // Call your edge function to send email
      const { data, error } = await supabase.functions.invoke('send-confirmation-email', {
        body: {
          to: email,
          subject: 'Reset your MapleAurum password',
          html: emailContent,
          userId: userId,
          type: 'password_reset'
        }
      });

      if (error) {
        console.error('[CustomAuthService] SendGrid error:', error);
        return { error };
      }

      if (!data || data.error) {
        console.error('[CustomAuthService] SendGrid returned error:', data);
        return { error: new Error(data?.error || 'Failed to send email') };
      }

      return { error: null };
    } catch (error) {
      console.error('[CustomAuthService] Failed to send email:', error);
      return { error: error as Error };
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, email: string, newPassword: string): Promise<{ error: Error | null }> {
    try {
      console.log('[CustomAuthService] Attempting password reset with token');

      // Step 1: Verify token
      const { data: resetData, error: tokenError } = await supabase
        .from('password_resets')
        .select('user_id, expires_at, used')
        .eq('token', token)
        .eq('email', email)
        .single();

      if (tokenError || !resetData) {
        console.error('[CustomAuthService] Invalid token:', tokenError);
        return { error: new Error('Invalid or expired reset link') };
      }

      if (resetData.used) {
        return { error: new Error('This reset link has already been used. Please request a new one.') };
      }

      if (new Date(resetData.expires_at) < new Date()) {
        return { error: new Error('This reset link has expired. Please request a new one.') };
      }

      // Step 2: Update password
      // Note: This requires calling an edge function with service role access
      const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          userId: resetData.user_id,
          newPassword: newPassword,
          resetToken: token // For verification in the edge function
        }
      });

      if (updateError || updateData?.error) {
        console.error('[CustomAuthService] Failed to update password:', updateError || updateData?.error);
        return { error: new Error('Failed to update password. Please try again.') };
      }

      // Step 3: Mark token as used
      const { error: markUsedError } = await supabase
        .from('password_resets')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('token', token);

      if (markUsedError) {
        console.error('[CustomAuthService] Failed to mark token as used:', markUsedError);
        // Don't fail the whole operation for this
      }

      // Step 4: Sign out any existing sessions
      await supabase.auth.signOut();

      return { error: null };
    } catch (error) {
      console.error('[CustomAuthService] Failed to reset password:', error);
      return { error: error as Error };
    }
  }
}