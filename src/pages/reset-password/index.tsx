// src/pages/reset-password/index.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient'; // Direct Supabase client import
import { useAuth } from '../../contexts/auth-context'; // To check session status
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, KeyRound, ArrowLeft } from 'lucide-react'; // Icons

export function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { session } = useAuth(); // Get session info
    const navigate = useNavigate();

    // Redirect if user is somehow fully logged in normally on this page
    useEffect(() => {
        // Check if the session exists and is NOT from a password recovery link
        // (Supabase might briefly create a session for recovery)
        // A more robust check might involve inspecting the session's auth event type if possible,
        // but usually just checking if a normal session exists is enough to redirect away.
        // If the user arrived via the email link, `onAuthStateChange` should have fired,
        // allowing `updateUser` below to work.
        if (session && !window.location.hash.includes('type=recovery')) { // Basic check if not recovery URL
             console.log("Normal session detected on reset page, redirecting...");
             navigate('/companies'); // Or home
        }
    }, [session, navigate]);


    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) { // Example: Enforce minimum length
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        // Supabase handles the recovery token implicitly when updateUser is called
        // after the user lands here from the email link.
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
            setError(updateError.message || 'Failed to update password.');
            console.error("Password Update Error:", updateError);
        } else {
            setMessage('Password successfully updated! You can now log in with your new password.');
            // Clear fields after success
            setPassword('');
            setConfirmPassword('');
            // Optional: Automatically navigate to login after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 3000); // 3 second delay
        }

        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4">
            {/* Optional Backgrounds */}
            {/* <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" /> */}
            {/* <div className="absolute inset-0 bg-noise opacity-[0.07] -z-10" aria-hidden="true" /> */}

            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 text-white backdrop-blur-sm shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-cyan-300">Set New Password</CardTitle>
                    <CardDescription className="text-gray-300">Enter and confirm your new password below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordUpdate} className="space-y-4">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {/* Success Message Alert */}
                        {message && (
                            <Alert variant="success">
                                <CheckCircle className="h-4 w-4" />
                                <AlertTitle>Success!</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

                        {/* Password Fields - Only show if success message is not displayed */}
                        {!message && (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="password" className="text-sm font-medium text-gray-300">New Password</label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-navy-600/80 border-navy-500 placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">Confirm New Password</label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="bg-navy-600/80 border-navy-500 placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500"
                                        disabled={loading}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:opacity-70"
                                    disabled={loading}
                                >
                                    {loading ? 'Updating...' : (
                                        <>
                                        <KeyRound className="mr-2 h-4 w-4" /> Update Password
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
                {/* Only show footer link if success message is displayed */}
                {message && (
                     <CardFooter className="flex justify-center text-sm text-gray-400 pt-4">
                        <Link to="/login" className="flex items-center font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
                        </Link>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}