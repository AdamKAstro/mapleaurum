// src/services/custom-auth-service.ts
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface SignUpResult {
  user: User | null;
  error: Error | null;
  requiresEmailConfirmation: boolean;
  confirmationToken?: string;
  emailSendingFailed?: boolean; // Added to match AuthContextType
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
      
      // Step 1: Create user with email confirmations disabled temporarily
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Don't send Supabase's confirmation email
          emailRedirectTo: undefined,
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
        
        return {
          user: null,
          error: signUpError,
          requiresEmailConfirmation: false
        };
      }

      if (!signUpData.user) {
        return {
          user: null,
          error: new Error('Failed to create user account'),
          requiresEmailConfirmation: false
        };
      }

      // Step 2: Generate confirmation token
      const confirmationToken = this.generateConfirmationToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      // Step 3: Store confirmation token in database
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
        // Don't fail the signup, but log the issue
      }

      // Step 4: Send confirmation email via SendGrid
      const confirmationUrl = `${window.location.origin}/confirm-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`;
      
      const { error: emailError } = await this.sendConfirmationEmail(email, confirmationUrl, signUpData.user.id);
      
      if (emailError) {
        console.error('[CustomAuthService] Failed to send confirmation email:', emailError);
        // Return success but note that email failed
        return {
          user: signUpData.user,
          error: new Error('Account created but confirmation email failed to send. Please contact support.'),
          requiresEmailConfirmation: true,
          confirmationToken
        };
      }

      console.log('[CustomAuthService] Signup successful, confirmation email sent');
      return {
        user: signUpData.user,
        error: null,
        requiresEmailConfirmation: true,
        confirmationToken
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
      // First, get the user and their latest confirmation token
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        return { error: new Error('User not found') };
      }

      // Check if user already confirmed
      const { data: user } = await supabase.auth.admin.getUserById(userData.id);
      if (user?.user?.email_confirmed_at) {
        return { error: new Error('Email already confirmed. Please sign in.') };
      }

      // Get or create new confirmation token
      const { data: existingToken } = await supabase
        .from('email_confirmations')
        .select('token, expires_at')
        .eq('user_id', userData.id)
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

        await supabase
          .from('email_confirmations')
          .insert({
            user_id: userData.id,
            email: email,
            token: confirmationToken,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString()
          });
      }

      // Send email
      const confirmationUrl = `${window.location.origin}/confirm-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`;
      return await this.sendConfirmationEmail(email, confirmationUrl, userData.id);
      
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
        return { error: new Error('This confirmation link has expired') };
      }

      // Mark token as used
      await supabase
        .from('email_confirmations')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('token', token);

      // Update user's email confirmation status
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        confirmationData.user_id,
        { 
          email_confirmed_at: new Date().toISOString(),
          user_metadata: { email_verified: true }
        }
      );

      if (updateError) {
        console.error('[CustomAuthService] Failed to update user:', updateError);
        return { error: new Error('Failed to confirm email. Please contact support.') };
      }

      return { error: null };
      
    } catch (error) {
      console.error('[CustomAuthService] Failed to confirm email:', error);
      return { error: error as Error };
    }
  }
}