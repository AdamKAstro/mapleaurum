// src/pages/reset-password/index.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';

export function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { session, isLoading: isAuthLoading, user } = useAuth();
    const navigate = useNavigate();
    
    // Track if we're in recovery mode based on URL
    const isRecoveryMode = window.location.hash.includes('type=recovery');
    const [hasProcessedToken, setHasProcessedToken] = useState(false);

    useEffect(() => {
        console.log('[ResetPasswordPage] Component mounted');
        console.log('[ResetPasswordPage] URL Hash:', window.location.hash);
        console.log('[ResetPasswordPage] Is Recovery Mode:', isRecoveryMode);
        console.log('[ResetPasswordPage] Auth Loading:', isAuthLoading);
        console.log('[ResetPasswordPage] Session:', session);
        console.log('[ResetPasswordPage] User:', user);
    }, [isRecoveryMode, isAuthLoading, session, user]);

    // Only redirect if we're NOT in recovery mode and auth has loaded
    useEffect(() => {
        if (!isAuthLoading && !isRecoveryMode && !hasProcessedToken) {
            // Only redirect if there's a normal user session
            if (session && user?.id) {
                console.warn("[ResetPasswordPage] Normal user session detected without recovery token. Redirecting to /companies.");
                navigate('/companies');
            }
        }
    }, [session, navigate, isAuthLoading, user, isRecoveryMode, hasProcessedToken]);

    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        setHasProcessedToken(true);

        try {
            console.log('[ResetPasswordPage] Attempting password update...');
            
            // When there's a recovery token in the URL, Supabase should handle it automatically
            const { data, error: updateError } = await supabase.auth.updateUser({ 
                password: password 
            });

            if (updateError) {
                console.error("[ResetPasswordPage] Password Update Error:", updateError);
                
                // Handle specific error cases
                if (updateError.message.includes('expired') || updateError.message.includes('invalid')) {
                    setError('This password reset link has expired or already been used. Please request a new one.');
                } else if (updateError.message.includes('not authenticated')) {
                    setError('Authentication session is missing. The reset link may be invalid. Please request a new password reset link.');
                } else {
                    setError(updateError.message || 'Failed to update password. Please try again or request a new reset link.');
                }
            } else {
                console.log("[ResetPasswordPage] Password update successful!", data);
                setMessage('Password successfully updated! Redirecting to login...');
                setPassword('');
                setConfirmPassword('');
                
                // Clear any existing session and redirect
                try {
                    await supabase.auth.signOut();
                    console.log("[ResetPasswordPage] Signed out successfully");
                } catch (signOutError) {
                    console.error("Error signing out:", signOutError);
                }

                // Redirect to auth page with success message
                setTimeout(() => {
                    navigate('/auth?message=password_reset_success');
                }, 2000);
            }
        } catch (err: any) {
            console.error('[ResetPasswordPage] Unexpected error:', err);
            setError('An unexpected error occurred. Please try again or contact support.');
        } finally {
            setLoading(false);
        }
    };

    // Show loading state only if we're in recovery mode and auth is still loading
    if (isRecoveryMode && isAuthLoading && !message && !error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-300" />
                <p className="mt-4 text-lg">Verifying reset link...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
            <div className="absolute inset-0 bg-cover bg-center opacity-[0.02] -z-10" 
                 style={{ backgroundImage: `url('/Background2.jpg')` }} 
                 aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-[0.05] -z-10" aria-hidden="true" />
            
            <div className="w-full max-w-md text-center mb-8">
                <CardTitle className="text-3xl sm:text-4xl font-bold text-cyan-300">
                    Reset Your Password
                </CardTitle>
                <CardDescription className="mt-2 text-gray-300 text-base sm:text-lg">
                    {isRecoveryMode 
                        ? 'Enter your new password below to complete the reset process.'
                        : 'This page requires a valid password reset link. Please check your email or request a new reset link.'}
                </CardDescription>
            </div>

            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 backdrop-blur-sm shadow-xl">
                <CardContent className="pt-6">
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {message && (
                            <Alert className="bg-emerald-900/30 border-emerald-600/50">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                <AlertTitle className="text-emerald-400">Success!</AlertTitle>
                                <AlertDescription className="text-emerald-300">{message}</AlertDescription>
                            </Alert>
                        )}

                        {!message && isRecoveryMode && (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="password-reset" className="text-sm font-medium text-gray-300">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="password-reset" 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new password (min 8 characters)" 
                                            required 
                                            disabled={loading}
                                            className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <label htmlFor="confirmPassword-reset" className="text-sm font-medium text-gray-300">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="confirmPassword-reset" 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password" 
                                            required 
                                            disabled={loading}
                                            className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center"
                                    disabled={loading || !isRecoveryMode}
                                >
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {loading ? 'Updating Password...' : 'Update Password'}
                                </Button>
                            </>
                        )}

                        {!isRecoveryMode && !message && (
                            <div className="text-center py-4">
                                <p className="text-gray-300 mb-4">
                                    You need a valid password reset link to use this page.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => navigate('/auth')}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
                                >
                                    Request Password Reset
                                </Button>
                            </div>
                        )}
                    </form>
                </CardContent>
                
                <CardFooter className="flex justify-center text-sm text-gray-400 pt-6">
                    <Link to="/auth" className="flex items-center font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
                    </Link>
                </CardFooter>
            </Card>

            {/* Help text */}
            <div className="mt-6 text-center text-sm text-gray-400 max-w-md">
                <p>
                    Having trouble? Contact support at{' '}
                    <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
                        support@mapleaurum.com
                    </a>
                </p>
            </div>
        </div>
    );
}