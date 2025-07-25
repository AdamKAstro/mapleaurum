// src/pages/forgot-password/index.tsx
import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CustomAuthService } from '../../services/custom-auth-service';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, Mail, ArrowLeft, Loader2, Info } from 'lucide-react';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [rateLimited, setRateLimited] = useState(false);

    const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setRateLimited(false);
        
        // Client-side validation
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Please enter your email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        
        console.log('[ForgotPasswordPage] Starting password reset process for:', trimmedEmail);
        setLoading(true);

        const result = await CustomAuthService.requestPasswordReset(trimmedEmail);
        
        if (result.error) {
            // Check for rate limiting
            if (result.message?.includes('rate limit')) {
                setRateLimited(true);
                setError('Too many password reset attempts. Please wait a few minutes before trying again.');
            } else {
                setError(result.message || 'Failed to send reset email. Please try again.');
            }
        } else {
            // Always show success for security
            setSuccess(true);
            setEmail('');
        }
        
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
            <div className="absolute inset-0 bg-cover bg-center opacity-[0.02] -z-10" 
                 style={{ backgroundImage: `url('/Background2.jpg')` }} 
                 aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-[0.05] -z-10" aria-hidden="true" />
            
            <div className="w-full max-w-md text-center mb-8">
                <CardTitle className="text-3xl sm:text-4xl font-bold text-cyan-300">
                    Forgot Password
                </CardTitle>
                <CardDescription className="mt-2 text-gray-300 text-base sm:text-lg">
                    Enter your email address below, and we'll send you a link to reset your password.
                </CardDescription>
            </div>

            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 backdrop-blur-sm shadow-xl">
                <CardContent className="pt-6">
                    <form onSubmit={handlePasswordReset} className="space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-900/30 border-red-600/50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        
                        {success && (
                            <Alert className="bg-emerald-900/30 border-emerald-600/50">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                <AlertTitle className="text-emerald-400">Check Your Email</AlertTitle>
                                <AlertDescription className="text-emerald-300">
                                    If an account exists with this email, you will receive a password reset link shortly.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!success && (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="email-forgot" className="text-sm font-medium text-gray-300">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="email-forgot" 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email address" 
                                            required 
                                            disabled={loading || rateLimited}
                                            className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            autoComplete="email"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center transition-all duration-200"
                                    disabled={loading || rateLimited}
                                >
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                                </Button>

                                {rateLimited && (
                                    <Alert className="bg-amber-900/30 border-amber-600/50">
                                        <Info className="h-4 w-4 text-amber-400" />
                                        <AlertDescription className="text-amber-300">
                                            Please wait a few minutes before requesting another reset link.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </>
                        )}
                    </form>
                </CardContent>
                
                <div className="px-6 pb-6">
                    <div className="border-t border-navy-600/50 pt-6">
                        <Link 
                            to="/auth" 
                            className="flex items-center justify-center font-medium text-cyan-400 hover:text-cyan-300 hover:underline text-sm transition-colors duration-200"
                        >
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