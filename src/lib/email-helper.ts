// src/lib/email-helper.ts
import { supabase } from './supabaseClient';

/**
 * Helper function to check if Supabase email settings are properly configured
 * This can help diagnose email sending issues
 */
export async function checkEmailConfiguration() {
  try {
    console.log('=== Supabase Email Configuration Check ===');
    
    // Check if we can access Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ Cannot connect to Supabase:', sessionError);
      return false;
    }
    console.log('✅ Supabase connection successful');
    
    // Get project settings (this might be restricted based on your setup)
    const projectUrl = supabase.supabaseUrl;
    console.log('📍 Project URL:', projectUrl);
    
    // Check if we're in development or production
    const isDevelopment = projectUrl.includes('localhost') || projectUrl.includes('127.0.0.1');
    console.log('🔧 Environment:', isDevelopment ? 'Development' : 'Production');
    
    if (isDevelopment) {
      console.log('⚠️  In development, Supabase uses Inbucket for emails');
      console.log('📧 Check emails at: http://localhost:54324/');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Email configuration check failed:', error);
    return false;
  }
}

/**
 * Alternative email confirmation approach using your SendGrid setup
 * This can be used if Supabase's built-in email is not working
 */
export async function sendConfirmationEmailViaSendGrid(email: string, confirmationUrl: string) {
  try {
    // Call your send-email edge function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Confirm your MapleAurum account',
        message: `
          Welcome to MapleAurum!
          
          Please confirm your email address by clicking the link below:
          
          ${confirmationUrl}
          
          If you didn't create an account, you can safely ignore this email.
          
          Best regards,
          The MapleAurum Team
        `
      }
    });
    
    if (error) throw error;
    
    console.log('✅ Confirmation email sent via SendGrid');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send email via SendGrid:', error);
    return { success: false, error };
  }
}

/**
 * Get a magic link for email confirmation (admin use only)
 * This can help users who can't receive emails
 */
export async function generateConfirmationLink(email: string): Promise<string | null> {
  try {
    // This requires admin access - only use in development or admin tools
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${window.location.origin}/login?message=confirm_email`
      }
    });
    
    if (error) throw error;
    
    return data?.properties?.email_otp || null;
  } catch (error) {
    console.error('Cannot generate confirmation link (requires admin access):', error);
    return null;
  }
}

/**
 * Debug helper to check why emails might be failing
 */
export function getEmailTroubleshootingInfo() {
  const info = {
    supabaseUrl: supabase.supabaseUrl,
    isDevelopment: window.location.hostname === 'localhost',
    browserInfo: navigator.userAgent,
    timestamp: new Date().toISOString(),
    possibleIssues: [] as string[]
  };
  
  // Check common issues
  if (info.isDevelopment) {
    info.possibleIssues.push('In development mode - check Inbucket at http://localhost:54324/');
  }
  
  if (info.supabaseUrl.includes('.supabase.co')) {
    info.possibleIssues.push('Using Supabase cloud - check email settings in dashboard');
    info.possibleIssues.push('Ensure email confirmations are enabled in Authentication settings');
    info.possibleIssues.push('Check if you have hit the email rate limit (3 emails per hour for free tier)');
  }
  
  return info;
}