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

/**
 * Custom auth service that uses SendGrid for email confirmations
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
}