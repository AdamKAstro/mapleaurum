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
    const [loading, setLoading] = useState(false); // For the form submission
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { session, isLoading: isAuthLoading, user } = useAuth(); // Get session, user, and auth loading state from context
    const navigate = useNavigate();

    // This effect handles initial page load logic.
    // Supabase client (with detectSessionInUrl: true) should automatically parse the token from the URL hash
    // and the onAuthStateChange listener in AuthContext should fire with a PASSWORD_RECOVERY event,
    // setting a temporary session.
    useEffect(() => {
        console.log('[ResetPasswordPage] useEffect triggered. Auth Loading:', isAuthLoading, 'Session (from AuthContext):', session, 'User (from AuthContext):', user);
        console.log('[ResetPasswordPage] Current window.location.hash:', window.location.hash);

        // If AuthContext has finished loading:
        if (!isAuthLoading) {
            // And if there's a normal, active user session (not just a recovery token session which might not have user.id immediately)
            // and the URL doesn't indicate it's a password recovery flow, then the user shouldn't be here.
            if (session && user?.id && !window.location.hash.includes('type=recovery')) {
                console.warn("[ResetPasswordPage] Normal user session detected. Redirecting to /companies.");
                navigate('/companies');
            }
            // Note: If !session and not a recovery URL, the page will render its default state,
            // which includes guidance that the link might be invalid.
        }
    }, [session, navigate, isAuthLoading, user]); // Dependencies for the effect

    // Handles the form submission for updating the password
    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevent default form submission
        setError(null);     // Clear previous errors
        setMessage(null);   // Clear previous messages

        // Basic client-side validation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) { // Enforce a minimum password length
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true); // Indicate loading state for the form
        console.log('[ResetPasswordPage] handlePasswordUpdate initiated.');
        console.log('[ResetPasswordPage] Session from AuthContext at time of update attempt:', session);

        // Critical Check: A session (even a temporary recovery one) must exist.
        // This session is established by Supabase when the user clicks the email link.
        if (!session) {
             setError('Authentication session is missing or has expired. This could be due to an invalid or old link. Please request a new password reset link.');
             console.error('[ResetPasswordPage] Attempted password update, but session from AuthContext is null. The recovery token might not have been processed correctly by Supabase client, or it has expired.');
             setLoading(false);
             return;
        }

        // Attempt to update the user's password using the Supabase client.
        // The recovery token from the URL is implicitly handled by supabase.auth.updateUser
        // when called in this recovery context.
        const { data, error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message || 'Failed to update password. The link may have expired, already been used, or another error occurred. Please try requesting a new link.');
            console.error("[ResetPasswordPage] Password Update Error:", updateError, "Returned Data:", data);
        } else {
            setMessage('Password successfully updated! You will be redirected to the login page shortly.');
            console.log("[ResetPasswordPage] Password update successful. User data from updateUser:", data.user);
            setPassword(''); // Clear password fields
            setConfirmPassword('');

            // Important: Sign out the temporary recovery session.
            // This ensures a clean state and that the user is truly logged out
            // before being redirected to the login page.
            await supabase.auth.signOut();
            console.log("[ResetPasswordPage] Signed out recovery session.");

            // Redirect to login page after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 3000); // 3-second delay
        }
        setLoading(false); // Reset loading state
    };

    // Display a loading indicator if AuthContext is still initializing its state,
    // and we haven't already shown a success or error message from a form submission.
    if (isAuthLoading && !message && !error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-300" />
                <p className="ml-4 mt-4 text-lg">Initializing session...</p>
                <p className="text-sm text-gray-400">Please wait while we verify your reset link.</p>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4">
            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 text-white backdrop-blur-sm shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-cyan-300">Set New Password</CardTitle>
                    <CardDescription className="text-gray-300 mt-2">
                        {/* Provide guidance based on whether a recovery hash is in the URL or a session exists */}
                        {(window.location.hash.includes('type=recovery') || session) && !message && !error
                            ? 'Enter and confirm your new password below.'
                            : 'If you did not arrive here from a valid password reset email link, this page may not work. Please request a new link if needed.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                        {/* Display error messages */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {/* Display success messages */}
                        {message && (
                            <Alert variant="success">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Success!</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

                        {/* Only show password fields if no success message has been set */}
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
                                        disabled={loading || isAuthLoading} // Disable if form is loading or auth is still initializing
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
                                        disabled={loading || isAuthLoading} // Disable if form is loading or auth is still initializing
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:opacity-70 flex items-center justify-center"
                                    disabled={loading || isAuthLoading} // Disable button if form is loading or auth is initializing
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
                {/* Show "Back to Login" link if a message or error is displayed, or if it seems not to be a valid recovery context */}
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