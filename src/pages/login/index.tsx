// src/pages/login/index.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Typography } from '../../components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSignupMode, setIsSignupMode] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const signupParam = searchParams.get('signup');
        const actionParam = searchParams.get('action');
        const emailParam = searchParams.get('email');
        const messageParam = searchParams.get('message');
        const planParam = searchParams.get('plan_name');

        const shouldBeSignupMode = signupParam === 'true' || actionParam === 'signup';
        setIsSignupMode(shouldBeSignupMode);

        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        }

        if (messageParam === 'confirm_email') {
            setMessage('Thank you for confirming your email! Please log in to continue.');
            setIsSignupMode(false);
        } else if (messageParam === 'password_reset_success') {
            setMessage('Password successfully reset. Please log in with your new password.');
            setIsSignupMode(false);
        } else if (planParam && shouldBeSignupMode) {
            setMessage(`Sign up to access your ${planParam} plan!`);
        }
    }, [location.search]);

    const pageTitle = isSignupMode ? 'Create Your MapleAurum Account' : 'Welcome Back to MapleAurum';
    const pageDescription = isSignupMode
        ? 'Join to access financial data and analytics for Canadian precious metals companies.'
        : 'Log in to continue your journey with us.';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        const fromState = (location.state as { from?: { pathname: string; search: string } })?.from;
        let redirectToPath = fromState?.pathname
            ? `${fromState.pathname}${fromState.search || ''}`
            : '/companies';

        const searchParams = new URLSearchParams(location.search);
        const planName = searchParams.get('plan_name');
        if (planName && isSignupMode) {
            redirectToPath = '/subscribe';
        }

        try {
            if (isSignupMode) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/login?message=confirm_email`,
                    },
                });

                if (signUpError) {
                    console.error('[LoginPage] Sign-up error:', signUpError.message);
                    throw new Error(signUpError.message);
                }

                if (data.user && !data.user.email_confirmed_at) {
                    setMessage('Sign up successful! Please check your email to confirm your account. Once confirmed, you can log in.');
                    setEmail('');
                    setPassword('');
                    // Redirect to /subscribe even if confirmation is required
                    setTimeout(() => {
                        console.log('[LoginPage] Redirecting to:', redirectToPath, 'after sign-up confirmation message.');
                        navigate(redirectToPath, { replace: true });
                    }, 2000); // Small delay to show the message
                } else if (data.user && data.session) {
                    console.log('[LoginPage] User signed up and auto-confirmed:', data.user.id);
                    navigate(redirectToPath, { replace: true });
                } else {
                    setMessage('Sign up successful! Please check your email to confirm your account.');
                    setTimeout(() => {
                        console.log('[LoginPage] Redirecting to:', redirectToPath, 'after sign-up confirmation message (fallback).');
                        navigate(redirectToPath, { replace: true });
                    }, 2000);
                }
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) {
                    console.error('[LoginPage] Login error:', signInError.message);
                    throw new Error(signInError.message);
                }

                if (data.user && data.session) {
                    console.log('[LoginPage] User logged in successfully:', data.user.id);
                    navigate(redirectToPath, { replace: true });
                } else {
                    throw new Error('Login failed. Please check your credentials.');
                }
            }
        } catch (err: any) {
            console.error('[LoginPage] Authentication error:', err);
            setError(err.message || `Failed to ${isSignupMode ? 'sign up' : 'log in'}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = (toSignup: boolean) => {
        setIsSignupMode(toSignup);
        setError(null);
        setMessage(null);
        setEmail('');
        setPassword('');
    };

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
                    {pageTitle}
                </Typography>
                <Typography variant="body" className="mt-2 text-gray-300 text-base sm:text-lg">
                    {pageDescription}
                </Typography>
            </div>

            <div className="w-full max-w-md bg-navy-700/60 border border-navy-600/50 backdrop-blur-sm shadow-xl p-6 sm:p-8 rounded-lg">
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Authentication Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {message && (
                    <Alert
                        variant={message.includes('check your email') ? 'default' : 'success'}
                        className="mb-6 bg-opacity-80"
                    >
                        {message.includes('check your email') ? (
                            <Mail className="h-4 w-4" />
                        ) : (
                            <CheckCircle className="h-4 w-4" />
                        )}
                        <AlertTitle>
                            {message.includes('check your email')
                                ? 'Confirmation Required'
                                : message.includes('Password successfully reset')
                                ? 'Success'
                                : 'Action Needed'}
                        </AlertTitle>
                        <AlertDescription>{message}</AlertDescription>
                    </Alert>
                )}

                {!(message && message.includes('check your email') && !message.includes('Please log in')) && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label htmlFor="email-login" className="text-sm font-medium text-gray-300 sr-only">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input
                                    id="email-login"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                    className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label
                                htmlFor="password-login"
                                className="text-sm font-medium text-gray-300 sr-only"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input
                                    id="password-login"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>
                        </div>

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
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center"
                        >
                            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            {loading ? 'Processing...' : isSignupMode ? 'Create Account' : 'Log In'}
                        </Button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm">
                    {isSignupMode ? (
                        <Typography variant="body" className="text-gray-400">
                            Already have an account?{' '}
                            <button
                                onClick={() => toggleMode(false)}
                                className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                            >
                                Log In
                            </button>
                        </Typography>
                    ) : (
                        <Typography variant="body" className="text-gray-400">
                            Don't have an account?{' '}
                            <Link
                                to="/login?signup=true"
                                className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                            >
                                Sign Up
                            </Link>
                        </Typography>
                    )}
                </div>
            </div>
        </div>
    );
}