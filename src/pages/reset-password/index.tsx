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

    useEffect(() => {
        console.log('[ResetPasswordPage] Auth Loading:', isAuthLoading, 'Session:', session, 'User:', user);
        console.log('[ResetPasswordPage] URL Hash:', window.location.hash);

        if (!isAuthLoading) {
            if (session && user?.id && !window.location.hash.includes('type=recovery')) {
                console.warn("[ResetPasswordPage] Normal user session detected. Redirecting to /companies.");
                navigate('/companies');
            }
        }
    }, [session, navigate, isAuthLoading, user]);

    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) { // Consider a stronger minimum password length
            setError('Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);
        console.log('[ResetPasswordPage] Updating password. Session from AuthContext:', session);

        if (!session && window.location.hash.includes('type=recovery')) {
             console.warn('[ResetPasswordPage] No active session in AuthContext, but URL indicates recovery. This might mean AuthContext is still initializing or token was not parsed yet by Supabase client listener. Proceeding with updateUser, Supabase client should handle implicit token.');
        } else if (!session) {
            setError('Authentication session is missing or has expired. The link may be invalid or old. Please request a new password reset link.');
            console.error('[ResetPasswordPage] Password update attempt failed: Session is null and not clearly in recovery URL state for updateUser.');
            setLoading(false);
            return;
        }
        
        // supabase.auth.updateUser implicitly uses the recovery token from the URL if present in this context
        const { data, error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message || 'Failed to update password. The link may have expired or already been used. Please try requesting a new link.');
            console.error("[ResetPasswordPage] Password Update Error:", updateError);
        } else {
            setMessage('Password successfully updated! You will be redirected to log in shortly.');
            console.log("[ResetPasswordPage] Password update successful. User data from updateUser:", data.user);
            setPassword(''); setConfirmPassword('');
            
            // Sign out to clear any recovery session, then redirect
            await supabase.auth.signOut().catch(err => console.error("Error signing out recovery session:", err));
            console.log("[ResetPasswordPage] Signed out recovery session (if any).");

            setTimeout(() => {
                navigate('/auth?message=password_reset_success'); // Redirect to login with a success message
            }, 3000);
        }
        setLoading(false);
    };

    if (isAuthLoading && !message && !error && window.location.hash.includes('type=recovery')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-300" />
                <p className="mt-4 text-lg">Verifying reset link...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
            <div className="absolute inset-0 bg-cover bg-center opacity-[0.02] -z-10" style={{ backgroundImage: `url('/Background2.jpg')` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-[0.05] -z-10" aria-hidden="true" />
            
            <div className="w-full max-w-md text-center mb-8">
                <CardTitle className="text-3xl sm:text-4xl font-bold text-cyan-300">Set Your New Password</CardTitle>
                <CardDescription className="mt-2 text-gray-300 text-base sm:text-lg">
                    {(window.location.hash.includes('type=recovery') || session) && !message && !error
                        ? 'Please enter and confirm your new password below.'
                        : 'If you didn\'t arrive from a valid password reset link, this page may not function correctly. Please request a new link if needed.'}
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
                            <Alert variant="success" className="bg-opacity-80">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Success!</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

                        {!message && (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="password-reset" className="text-sm font-medium text-gray-300 sr-only">New Password</label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="password-reset" type="password" value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter new password" required disabled={loading || isAuthLoading}
                                            className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="confirmPassword-reset" className="text-sm font-medium text-gray-300 sr-only">Confirm New Password</label>
                                     <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="confirmPassword-reset" type="password" value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password" required disabled={loading || isAuthLoading}
                                            className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                        />
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center"
                                    disabled={loading || (!session && !window.location.hash.includes('type=recovery'))} // Also disable if clearly not in recovery context
                                >
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {loading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
                {(message || error || (!session && !isAuthLoading && !window.location.hash.includes('type=recovery'))) && (
                    <CardFooter className="flex justify-center text-sm text-gray-400 pt-6">
                        <Link to="/auth" className="flex items-center font-medium text-cyan-400 hover:text-cyan-300 hover:underline">
                            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login / Sign Up
                        </Link>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}