// src/pages/reset-password/index.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient'; // Direct Supabase client import
import { useAuth } from '../../contexts/auth-context'; // To check session status
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, KeyRound, ArrowLeft, Loader2 } from 'lucide-react'; // Icons

export function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { session, isLoading: isAuthLoading, user } = useAuth(); // Get session, user and auth loading state
    const navigate = useNavigate();

    useEffect(() => {
        // This effect runs when the component mounts and when session or isAuthLoading changes.
        // Supabase's onAuthStateChange (in AuthContext) should fire with event PASSWORD_RECOVERY
        // when the user lands on this page from an email link, setting a temporary session.
        // detectSessionInUrl: true in supabaseClient.ts is crucial for this.

        console.log('[ResetPasswordPage] Effect triggered. Auth Loading:', isAuthLoading, 'Session (from context):', session, 'User (from context):', user);
        console.log('[ResetPasswordPage] Current window.location.hash:', window.location.hash);

        // If auth is done loading and there's a "normal" user session (meaning user.id is present and it's not clearly a recovery hash)
        // then redirect them away, as they shouldn't be on the reset page.
        if (!isAuthLoading && session && user?.id && !window.location.hash.includes('type=recovery')) {
            console.warn("[ResetPasswordPage] Normal user session detected. Redirecting to /companies.");
            navigate('/companies');
        } else if (!isAuthLoading && !session && !window.location.hash.includes('type=recovery')) {
            // If auth is done, no session, and not a recovery URL, something is wrong, maybe send to login.
            // This case might be too aggressive if the AuthContext is slow to update with the recovery session.
            // console.warn("[ResetPasswordPage] No session and not a recovery URL. Redirecting to /login.");
            // navigate('/login');
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
        if (password.length < 6) { // Example: Enforce minimum length
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        console.log('[ResetPasswordPage] handlePasswordUpdate initiated.');

        // Supabase client should have processed the URL fragment and established a recovery session.
        // This session is then picked up by the AuthContext.
        // We rely on the session from AuthContext here.
        console.log('[ResetPasswordPage] Session from AuthContext at time of update attempt:', session);

        if (!session) {
             setError('Authentication session is missing or has expired. Please request a new password reset link.');
             console.error('[ResetPasswordPage] Attempted password update, but session from AuthContext is null. The recovery token might not have been processed correctly or has expired.');
             setLoading(false);
             return;
        }

        // If a session exists (it should be the temporary recovery session), proceed to update the user.
        const { data, error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message || 'Failed to update password. The link may have expired, already been used, or another error occurred.');
            console.error("[ResetPasswordPage] Password Update Error:", updateError, "Returned Data:", data);
        } else {
            setMessage('Password successfully updated! You will be redirected to the login page shortly.');
            console.log("[ResetPasswordPage] Password update successful. User data:", data.user);
            setPassword('');
            setConfirmPassword('');
            // Sign out the temporary recovery session to ensure a clean state before navigating to login
            await supabase.auth.signOut();
            console.log("[ResetPasswordPage] Signed out recovery session.");
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        }
        setLoading(false);
    };

    // Show a global loading indicator if AuthContext is still initializing
    // and we haven't hit an error or success message yet.
    if (isAuthLoading && !message && !error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-300" />
                <p className="ml-4 text-white">Initializing session...</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4">
            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 text-white backdrop-blur-sm shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-cyan-300">Set New Password</CardTitle>
                    <CardDescription className="text-gray-300">
                        {/* Provide guidance based on whether a recovery hash is in the URL */}
                        {window.location.hash.includes('type=recovery') || session
                            ? 'Enter and confirm your new password below.'
                            : 'If you did not arrive here from a password reset email link, please request a new one.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {message && (
                            <Alert variant="success">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Success!</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

                        {/* Only show password fields if no success message */}
                        {!message && (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="password" className="text-sm font-medium text-gray-300 sr-only">New Password</label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter new password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-navy-600/80 border-navy-500 placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300 sr-only">Confirm New Password</label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="bg-navy-600/80 border-navy-500 placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                                        disabled={loading}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:opacity-70 flex items-center justify-center"
                                    disabled={loading || isAuthLoading} // Also disable if auth is still loading initially
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                        <KeyRound className="mr-2 h-4 w-4" /> Update Password
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
                {/* Show Back to Login link if there's a message or error, or if it seems like not a recovery session */}
                {(message || error || (!session && !isAuthLoading && !window.location.hash.includes('type=recovery'))) && (
                     <CardFooter className="flex justify-center text-sm text-gray-400 pt-6">
                        <Link to="/login" className="flex items-center font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
                        </Link>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}