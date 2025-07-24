// src/pages/reset-password/index.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CustomAuthService } from '../../services/custom-auth-service';
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
    const location = useLocation();
    
    // Extract token and email from URL
    const urlParams = new URLSearchParams(location.search);
    const resetToken = urlParams.get('token');
    const resetEmail = urlParams.get('email');
    
    const [isValidatingToken, setIsValidatingToken] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        console.log('[ResetPasswordPage] Component mounted');
        console.log('[ResetPasswordPage] Reset token:', resetToken ? `${resetToken.substring(0, 10)}...` : 'null');
        console.log('[ResetPasswordPage] Reset email:', resetEmail);
        
        // Validate that we have required parameters
        if (!resetToken || !resetEmail) {
            console.error('[ResetPasswordPage] Missing token or email in URL');
            setError('Invalid reset link. Please request a new password reset.');
            setIsValidatingToken(false);
            return;
        }
        
        setTokenValid(true);
        setIsValidatingToken(false);
    }, [resetToken, resetEmail]);

    // Don't redirect users with valid reset tokens
    useEffect(() => {
        if (!isAuthLoading && !isValidatingToken && !tokenValid && !resetToken) {
            // Only redirect if there's no reset token at all
            if (session && user?.id) {
                console.log("[ResetPasswordPage] User logged in without reset token, redirecting");
                navigate('/companies');
            }
        }
    }, [session, navigate, isAuthLoading, user, isValidatingToken, tokenValid, resetToken]);

    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        console.log('[ResetPasswordPage] Starting password update');

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (!resetToken || !resetEmail) {
            setError('Missing reset information. Please request a new password reset.');
            return;
        }

        setLoading(true);

        try {
            const { error: resetError } = await CustomAuthService.resetPassword(
                resetToken,
                decodeURIComponent(resetEmail),
                password
            );

            if (resetError) {
                console.error("[ResetPasswordPage] Password reset error:", resetError);
                setError(resetError.message);
            } else {
                console.log("[ResetPasswordPage] Password reset successful!");
                setMessage('Password successfully updated! Redirecting to login...');
                setPassword('');
                setConfirmPassword('');
                
                // Redirect to login with success message
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

    // Show loading state while validating
    if (isValidatingToken) {
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
                    {tokenValid 
                        ? 'Enter your new password below to complete the reset process.'
                        : 'This page requires a valid password reset link.'}
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

                        {!message && tokenValid && (
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
                                    disabled={loading || !tokenValid}
                                >
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {loading ? 'Updating Password...' : 'Update Password'}
                                </Button>
                            </>
                        )}

                        {!tokenValid && !message && (
                            <div className="text-center py-4">
                                <p className="text-gray-300 mb-4">
                                    You need a valid password reset link to use this page.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
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