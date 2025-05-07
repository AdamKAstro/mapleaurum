// src/pages/forgot-password/index.tsx
import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient'; // Direct Supabase client import for this specific auth action
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, Mail, ArrowLeft } from 'lucide-react'; // Icons

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null); // For success message

    const handlePasswordResetRequest = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        // Get the current base URL for the redirect link
        const redirectUrl = `${window.location.origin}/reset-password`;
        console.log("Password reset redirect URL:", redirectUrl); // Log the redirect URL

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl, // URL user will be sent to after clicking email link
        });

        if (resetError) {
            setError(resetError.message || 'An unknown error occurred.');
            console.error("Password Reset Error:", resetError);
        } else {
            setMessage('Password reset instructions sent! Please check your email (including spam folder) for a link to reset your password.');
            setEmail(''); // Clear the email field on success
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
                    <CardTitle className="text-2xl font-bold text-cyan-300">Forgot Password</CardTitle>
                    <CardDescription className="text-gray-300">Enter your email address below, and we'll send you a link to reset your password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordResetRequest} className="space-y-4">
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
                            <Alert variant="success"> {/* Assuming a success variant exists */}
                                <Mail className="h-4 w-4" />
                                <AlertTitle>Check Your Email</AlertTitle>
                                <AlertDescription>{message}</AlertDescription>
                            </Alert>
                        )}

                        {/* Email Input - Only show if message is not displayed */}
                        {!message && (
                            <div className="space-y-1">
                                <label htmlFor="email" className="text-sm font-medium text-gray-300">Email Address</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-navy-600/80 border-navy-500 placeholder-gray-400 focus:ring-cyan-500 focus:border-cyan-500"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {/* Submit Button - Only show if message is not displayed */}
                        {!message && (
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:opacity-70"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </Button>
                        )}
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center text-sm text-gray-400 pt-4">
                    <Link to="/login" className="flex items-center font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}