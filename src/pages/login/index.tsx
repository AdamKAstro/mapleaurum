// src/pages/login/index.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Typography } from '../../components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context';
import { isValidAppTrialPromoCode, type AppTrialPromoCodeKey } from '../../stripe-config';

interface LoginFormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

export function LoginPage() {
  const { 
    signIn, 
    signUp, 
    resendConfirmationEmail, 
    isLoading: authLoading, 
    error: authError, 
    clearError,
    signInWithGoogle // Get the new function from the hook
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '', confirmPassword: '' });
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmationOptions, setShowConfirmationOptions] = useState(false);
  const [emailForConfirmation, setEmailForConfirmation] = useState<string>('');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    const email = searchParams.get('email');
    const message = searchParams.get('message');
    const planName = searchParams.get('plan_name');
    const promoCode = searchParams.get('promo_code') as AppTrialPromoCodeKey | null;
    const coupon = searchParams.get('coupon');

    setIsSignupMode(action === 'signup');

    if (email) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(email) }));
    }

    if (message === 'confirm_email') {
      setSuccessMessage('Email confirmed! Please log in to continue.');
      setIsSignupMode(false);
    } else if (message === 'email_confirmed') {
      setSuccessMessage('Your email has been confirmed! You can now sign in to your account.');
      setIsSignupMode(false);
    } else if (message === 'password_reset_success') {
      setSuccessMessage('Password reset successful. Please log in with your new password.');
      setIsSignupMode(false);
    }

    if (action === 'signup' && (planName || promoCode || coupon)) {
      let contextMessage = 'Create your account';
      if (planName) contextMessage += ` to access your ${planName}`;
      if (promoCode && isValidAppTrialPromoCode(promoCode)) contextMessage += ' with special trial access';
      if (coupon) contextMessage += ' with promotional pricing';
      setSuccessMessage(contextMessage + '!');
    }

    if (action === 'resend_confirmation' && email) {
      setEmailForConfirmation(decodeURIComponent(email));
      setShowConfirmationOptions(true);
    }
  }, [location.search]);

  useEffect(() => {
    setLocalError(null);
    clearError();
    setShowConfirmationOptions(false);
    if (isSignupMode) {
      setFormData(prev => ({ ...prev, confirmPassword: '' }));
    }
  }, [isSignupMode, clearError]);

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return false;
    }
    if (!formData.email.includes('@')) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    if (isSignupMode && formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    return true;
  };

  const getRedirectPath = (): string => {
    const fromState = (location.state as { from?: { pathname: string; search: string } })?.from;
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('plan_name') || searchParams.get('promo_code') || searchParams.get('coupon')) {
      return `/subscribe?${searchParams.toString()}`;
    }
    return fromState ? `${fromState.pathname}${fromState.search || ''}` : '/companies';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    if (!validateForm()) return;
    setIsProcessing(true);
    const redirectPath = getRedirectPath();
    try {
      if (isSignupMode) {
        const { error, requiresEmailConfirmation, user, emailSendingFailed } = await signUp({
          email: formData.email,
          password: formData.password,
          emailRedirectTo: `${window.location.origin}/login?message=confirm_email`
        });
        if (error && !emailSendingFailed) {
          if (error.message.toLowerCase().includes('already registered')) {
            setLocalError('This email is already registered. Please sign in or reset your password.');
            setShowConfirmationOptions(false);
          } else {
            setLocalError(error.message);
          }
        } else if (requiresEmailConfirmation) {
          if (emailSendingFailed) {
            setSuccessMessage(
              `Account created successfully! However, we couldn't send the confirmation email to ${formData.email}. ` +
              `This is likely a temporary issue. You can try resending the confirmation email below.`
            );
            setEmailForConfirmation(formData.email);
            setShowConfirmationOptions(true);
            setFormData({ email: '', password: '', confirmPassword: '' });
          } else {
            setSuccessMessage(
              `Account created! Please check your email (${formData.email}) to confirm your account. ` +
              `You may need to check your spam folder.`
            );
            setEmailForConfirmation(formData.email);
            setShowConfirmationOptions(true);
            setFormData({ email: '', password: '', confirmPassword: '' });
            setTimeout(() => {
              if (redirectPath.includes('subscribe')) {
                navigate(redirectPath);
              }
            }, 5000);
          }
        } else if (user && !requiresEmailConfirmation) {
          navigate(redirectPath, { replace: true });
        }
      } else {
        const { error } = await signIn({
          email: formData.email,
          password: formData.password,
        });
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setLocalError('Please confirm your email before signing in. Check your inbox for the confirmation link.');
            setEmailForConfirmation(formData.email);
            setShowConfirmationOptions(true);
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            setLocalError('Invalid email or password. Please try again.');
          } else {
            setLocalError(error.message);
          }
        } else {
          const pendingPromoCode = sessionStorage.getItem('pending_promo_code');
          const pendingPromoPlan = sessionStorage.getItem('pending_promo_plan');
          const pendingPromoYearly = sessionStorage.getItem('pending_promo_yearly');
          const userJustConfirmed = sessionStorage.getItem('user_just_confirmed');
          console.log('[LoginPage] Checking for pending promo activation:', {
            pendingPromoCode,
            pendingPromoPlan,
            pendingPromoYearly,
            userJustConfirmed
          });
          if (pendingPromoCode && pendingPromoPlan && userJustConfirmed === 'true') {
            sessionStorage.removeItem('pending_promo_code');
            sessionStorage.removeItem('pending_promo_plan');
            sessionStorage.removeItem('pending_promo_yearly');
            sessionStorage.removeItem('user_just_confirmed');
            const activationParams = new URLSearchParams({
              promo_code: pendingPromoCode,
              plan: pendingPromoPlan,
              activate_now: 'true'
            });
            if (pendingPromoYearly === 'true') {
              activationParams.set('yearly', 'true');
            }
            console.log('[LoginPage] Redirecting to activate promo:', `/subscribe?${activationParams.toString()}`);
            navigate(`/subscribe?${activationParams.toString()}`, { replace: true });
          } else {
            navigate(redirectPath, { replace: true });
          }
        }
      }
    } catch (err: any) {
      console.error('[LoginPage] Unexpected error:', err);
      setLocalError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!emailForConfirmation) return;
    setIsProcessing(true);
    setLocalError(null);
    try {
      const { error } = await resendConfirmationEmail(emailForConfirmation);
      if (error) {
        setLocalError(`Unable to resend confirmation: ${error.message}`);
      } else {
        setSuccessMessage(`Confirmation email resent to ${emailForConfirmation}. Please check your inbox and spam folder.`);
      }
    } catch (err) {
      setLocalError('Failed to resend confirmation email. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const switchMode = (toSignup: boolean) => {
    setIsSignupMode(toSignup);
    setLocalError(null);
    setSuccessMessage(null);
    setShowConfirmationOptions(false);
    clearError();
  };
  
  // NEW FUNCTION: Handles the Google sign-in click event
  const handleGoogleSignIn = async () => {
    clearError();
    await signInWithGoogle();
  };

  const displayError = localError || authError?.message;
  const isLoading = authLoading || isProcessing;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.02] -z-10"
        style={{ backgroundImage: `url('/Background2.jpg')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-noise opacity-[0.05] -z-10" aria-hidden="true" />

      <div className="w-full max-w-md text-center mb-8">
        <Typography variant="h1" className="text-3xl sm:text-4xl font-bold tracking-tight text-cyan-300">
          {isSignupMode ? 'Create Your Account' : 'Welcome Back'}
        </Typography>
        <Typography variant="body" className="mt-2 text-gray-300 text-base sm:text-lg">
          {isSignupMode
            ? 'Join MapleAurum to access premium mining analytics'
            : 'Sign in to continue your analysis'}
        </Typography>
      </div>

      <div className="w-full max-w-md bg-navy-700/60 border border-navy-600/50 backdrop-blur-sm shadow-xl p-6 sm:p-8 rounded-lg">
        {displayError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert variant="default" className="mb-6 border-emerald-600/50 bg-emerald-900/20">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <AlertTitle className="text-emerald-300">Success</AlertTitle>
            <AlertDescription className="text-emerald-200">{successMessage}</AlertDescription>
          </Alert>
        )}

        {showConfirmationOptions && emailForConfirmation && (
          <Alert variant="default" className="mb-6 border-blue-600/50 bg-blue-900/20">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertTitle className="text-blue-300">Email Confirmation Required</AlertTitle>
            <AlertDescription className="text-blue-200">
              <div className="mt-2 space-y-3">
                <Button
                  onClick={handleResendConfirmation}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="w-full border-blue-500 text-blue-300 hover:bg-blue-700/20"
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-3 w-3" />
                  )}
                  Resend Confirmation Email
                </Button>
                <div className="text-xs space-y-1">
                  <p className="font-medium">Didn't receive the email? Try these steps:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Check your spam/junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes - emails can sometimes be delayed</li>
                    <li>Try resending using the button above</li>
                  </ul>
                  <p className="mt-2">
                    Still having issues? Contact us at{' '}
                    <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
                      support@mapleaurum.com
                    </a>
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                disabled={isLoading}
                minLength={6}
                className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {isSignupMode && (
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required={isSignupMode}
                  disabled={isLoading}
                  minLength={6}
                  className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          {!isSignupMode && (
            <div className="text-right text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center"
          >
            {isLoading
              ? 'Processing...'
              : isSignupMode
                ? 'Create Account'
                : 'Sign In'}
          </Button>
        </form>

        {/* Divider and Google Sign-in button */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>
        
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 py-2.5"
          type="button" // Prevents form submission
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <img src="/google-icon.svg" alt="Google" className="h-4 w-4" />
          )}
          <span>Sign {isSignupMode ? 'Up' : 'In'} with Google</span>
        </Button>

        <div className="mt-6 text-center">
          <Typography variant="body" className="text-sm text-gray-400">
            {isSignupMode ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => switchMode(false)}
                  className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => switchMode(true)}
                  className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Create Account
                </button>
              </>
            )}
          </Typography>
        </div>

        <div className="mt-4 text-center">
          <Typography variant="bodySmall" className="text-xs text-gray-500">
            Need help? Contact{' '}
            <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
              support@mapleaurum.com
            </a>
          </Typography>
        </div>
      </div>
    </div>
  );
}