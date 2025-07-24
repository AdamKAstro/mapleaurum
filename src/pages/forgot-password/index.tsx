// src/pages/forgot-password/index.tsx
import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CustomAuthService } from '../../services/custom-auth-service';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, Mail, ArrowLeft, Loader2 } from 'lucide-react';

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handlePasswordReset = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        
        console.log('[ForgotPasswordPage] Starting password reset process...');
        console.log('[ForgotPasswordPage] Email:', email);

        setLoading(true);

        try {
            const { success, error: resetError, emailSendingFailed } = await CustomAuthService.requestPasswordReset(email);
            
            console.log('[ForgotPasswordPage] Reset result:', { success, error: resetError, emailSendingFailed });

            if (resetError) {
                setError(resetError.message);
            } else {
                // Always show success message for security (don't reveal if email exists)
                setMessage('If an account exists with this email, you will receive a password reset link shortly.');
                setEmail('');
                
                if (emailSendingFailed) {
                    console.warn('[ForgotPasswordPage] Email sending failed but account exists');
                    // You might want to show a subtle hint to contact support
                }
            }
        } catch (err: any) {
            console.error('[ForgotPasswordPage] Unexpected error:', err);
            setError('An unexpected error occurred. Please try again or contact support.');
        } finally {
            setLoading(false);
        }
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
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        {message && (
                            <Alert className="bg-emerald-900/30 border-emerald-600/50">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                <AlertTitle className="text-emerald-400">Check Your Email</AlertTitle>
                                <AlertDescription className="text-emerald-300">{message}</AlertDescription>
                            </Alert>
                        )}

                        {!message && (
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
                                            disabled={loading}
                                            className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                        />
                                    </div>
                                </div>
                                
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center"
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                                </Button>
                            </>
                        )}
                    </form>
                </CardContent>
                
                <div className="px-6 pb-6">
                    <div className="border-t border-navy-600/50 pt-6">
                        <Link to="/auth" className="flex items-center justify-center font-medium text-cyan-400 hover:text-cyan-300 hover:underline text-sm">
                            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
                        </Link>
                    </div>
                </div>
            </Card>

            <div className="mt-6 text-center text-sm text-gray-400 max-w-md">
                <p>
                    Email should arrive within a few minutes. Check your spam folder if needed.
                </p>
            </div>
        </div>
    );
}