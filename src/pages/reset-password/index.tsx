// src/pages/reset-password/index.tsx
import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { CustomAuthService } from '../../services/custom-auth-service';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, KeyRound, ArrowLeft, Loader2, Eye, EyeOff, Shield, Info, XCircle } from 'lucide-react';

interface PasswordStrengthUI {
    score: number;
    color: string;
    text: string;
    percentage: number;
}

export function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
    const [passwordStrengthUI, setPasswordStrengthUI] = useState<PasswordStrengthUI>({
        score: 0,
        color: 'bg-gray-400',
        text: '',
        percentage: 0
    });
    
    const { session, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Session validation states
    const [hasValidSession, setHasValidSession] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [sessionError, setSessionError] = useState<string | null>(null);

    // Check for error parameters in URL (from Supabase redirect)
    useEffect(() => {
        const errorDescription = searchParams.get('error_description');
        if (errorDescription) {
            console.error('[ResetPasswordPage] Supabase redirect error:', errorDescription);
            if (errorDescription.toLowerCase().includes('expired')) {
                setSessionError('Your password reset link has expired. Please request a new one.');
            } else if (errorDescription.toLowerCase().includes('invalid')) {
                setSessionError('This password reset link is invalid. Please request a new one.');
            } else {
                setSessionError('There was an error with your reset link. Please request a new one.');
            }
            setIsCheckingSession(false);
        }
    }, [searchParams]);

    // Validate session
    useEffect(() => {
        const checkSession = async () => {
            if (sessionError) return; // Skip if we already have an error from URL
            
            console.log('[ResetPasswordPage] Checking for recovery session...');
            
            if (!isAuthLoading) {
                try {
                    const sessionResponse = await CustomAuthService.getCurrentSession();
                    
                    if (sessionResponse.success && sessionResponse.data) {
                        console.log('[ResetPasswordPage] Valid session found:', {
                            userId: sessionResponse.metadata?.userId,
                            isRecovery: sessionResponse.metadata?.isRecoverySession
                        });
                        setHasValidSession(true);
                    } else {
                        console.log('[ResetPasswordPage] No valid session found');
                        setSessionError('Your reset link is invalid or has expired. Please request a new one.');
                    }
                } catch (error) {
                    console.error('[ResetPasswordPage] Error checking session:', error);
                    setSessionError('Unable to verify your reset link. Please try again.');
                } finally {
                    setIsCheckingSession(false);
                }
            }
        };

        checkSession();
    }, [session, isAuthLoading, sessionError]);

    // Real-time password validation
    const validatePasswordRealtime = useCallback((pwd: string) => {
        if (!pwd) {
            setPasswordFeedback([]);
            setPasswordStrengthUI({
                score: 0,
                color: 'bg-gray-400',
                text: '',
                percentage: 0
            });
            return;
        }

        const validation = CustomAuthService.validatePassword(pwd);
        setPasswordFeedback(validation.feedback);

        // Calculate UI elements
        const percentage = (validation.score / 5) * 100;
        let color = 'bg-red-500';
        let text = 'Weak';

        if (validation.score >= 4) {
            color = 'bg-green-500';
            text = 'Strong';
        } else if (validation.score >= 3) {
            color = 'bg-yellow-500';
            text = 'Good';
        } else if (validation.score >= 2) {
            color = 'bg-orange-500';
            text = 'Fair';
        }

        setPasswordStrengthUI({ score: validation.score, color, text, percentage });
    }, []);

    // Update validation when password changes
    useEffect(() => {
        validatePasswordRealtime(password);
    }, [password, validatePasswordRealtime]);

    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        console.log('[ResetPasswordPage] Starting password update');

        // Confirm password match
        if (password !== confirmPassword) {
            setError('Passwords do not match. Please ensure both fields contain the same password.');
            return;
        }

        setLoading(true);

        try {
            const result = await CustomAuthService.updateUserPassword(password);

            if (result.success) {
                console.log('[ResetPasswordPage] Password reset successful!');
                setSuccess(true);
                setPassword('');
                setConfirmPassword('');
                
                // Show success for 3 seconds then redirect
                setTimeout(() => {
                    navigate('/auth?message=password_reset_success');
                }, 3000);
            } else {
                console.error('[ResetPasswordPage] Password update failed:', result.error);
                setError(result.message);
                
                // Handle specific error codes
                if (result.metadata?.errorCode === 'RATE_LIMITED') {
                    // Add additional UI feedback for rate limiting
                    setTimeout(() => {
                        setError(prev => prev + ' You can try again in a few minutes.');
                    }, 100);
                }
            }
        } catch (error) {
            console.error('[ResetPasswordPage] Unexpected error:', error);
            setError('An unexpected error occurred. Please try again or contact support.');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (isCheckingSession || isAuthLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-cyan-300 mx-auto" />
                    <div>
                        <p className="text-lg font-medium">Verifying reset link...</p>
                        <p className="text-sm text-gray-400 mt-1">Please wait while we validate your request</p>
                    </div>
                </div>
            </div>
        );
    }

    // Determine if we should show the form
    const showResetForm = hasValidSession && !sessionError && !success;

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
                    {showResetForm 
                        ? 'Create a strong password to secure your account.'
                        : sessionError || 'Complete the password reset process.'}
                </CardDescription>
            </div>

            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 backdrop-blur-sm shadow-xl">
                <CardContent className="pt-6">
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                        {/* Error Alert */}
                        {(error || sessionError) && !success && (
                            <Alert variant="destructive" className="bg-red-900/30 border-red-600/50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error || sessionError}</AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Success Alert */}
                        {success && (
                            <Alert className="bg-emerald-900/30 border-emerald-600/50">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                <AlertTitle className="text-emerald-400">Success!</AlertTitle>
                                <AlertDescription className="text-emerald-300">
                                    Password successfully updated! Redirecting to login...
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Password Reset Form */}
                        {showResetForm && (
                            <>
                                {/* New Password Field */}
                                <div className="space-y-1">
                                    <label htmlFor="password-reset" className="text-sm font-medium text-gray-300">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="password-reset" 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Enter a strong password" 
                                            required 
                                            disabled={loading}
                                            className="pl-10 pr-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            autoComplete="new-password"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                                            tabIndex={-1}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    
                                    {/* Password Strength Indicator */}
                                    {password && (
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-navy-600/50 rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-300 ${passwordStrengthUI.color}`}
                                                        style={{ width: `${passwordStrengthUI.percentage}%` }}
                                                        role="progressbar"
                                                        aria-valuenow={passwordStrengthUI.percentage}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-label="Password strength"
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 min-w-[3rem] text-right">
                                                    {passwordStrengthUI.text}
                                                </span>
                                            </div>
                                            
                                            {/* Password Feedback */}
                                            {passwordFeedback.length > 0 && (
                                                <div className="bg-navy-800/50 rounded-lg p-3 space-y-1">
                                                    <p className="text-xs font-medium text-gray-300 flex items-center gap-1">
                                                        <Shield className="h-3 w-3" />
                                                        Password recommendations:
                                                    </p>
                                                    <ul className="text-xs text-gray-400 space-y-1 ml-4">
                                                        {passwordFeedback.map((tip, index) => (
                                                            <li key={index} className="flex items-start gap-1">
                                                                <span className="text-cyan-400 mt-0.5">•</span>
                                                                <span>{tip}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Confirm Password Field */}
                                <div className="space-y-1">
                                    <label htmlFor="confirmPassword-reset" className="text-sm font-medium text-gray-300">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <Input
                                            id="confirmPassword-reset" 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your password" 
                                            required 
                                            disabled={loading}
                                            className="pl-10 pr-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                                            tabIndex={-1}
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    
                                    {/* Password Match Indicator */}
                                    {confirmPassword && (
                                        <div className="flex items-center gap-1 mt-1">
                                            {password === confirmPassword ? (
                                                <>
                                                    <CheckCircle className="h-3 w-3 text-green-400" />
                                                    <span className="text-xs text-green-400">Passwords match</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-3 w-3 text-red-400" />
                                                    <span className="text-xs text-red-400">Passwords do not match</span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white py-2.5 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={
                                        loading || 
                                        passwordFeedback.length > 0 || 
                                        !password || 
                                        !confirmPassword || 
                                        password !== confirmPassword
                                    }
                                >
                                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    {loading ? 'Updating Password...' : 'Update Password'}
                                </Button>

                                {/* Security Tips */}
                                <Alert className="bg-blue-900/20 border-blue-600/30">
                                    <Info className="h-4 w-4 text-blue-400" />
                                    <AlertDescription className="text-blue-300 text-xs">
                                        <strong>Security tip:</strong> Use a unique password that you don't use for other accounts. 
                                        Consider using a password manager to generate and store strong passwords.
                                    </AlertDescription>
                                </Alert>
                            </>
                        )}

                        {/* Invalid/Expired Link State */}
                        {(sessionError || (!hasValidSession && !isCheckingSession)) && !success && (
                            <div className="text-center py-4 space-y-4">
                                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
                                    <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                    <p className="text-gray-300 text-sm">
                                        {sessionError || 'Your password reset link is invalid or has expired.'}
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <Button
                                        type="button"
                                        onClick={() => navigate('/forgot-password')}
                                        className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
                                    >
                                        Request New Password Reset
                                    </Button>
                                    
                                    <p className="text-xs text-gray-400">
                                        Password reset links expire after 1 hour for security reasons.
                                    </p>
                                </div>
                            </div>
                        )}
                    </form>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-4 text-sm text-gray-400 pt-6">
                    <Link 
                        to="/auth" 
                        className="flex items-center font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Login
                    </Link>
                    
                    {/* Additional Help Text */}
                    {showResetForm && (
                        <p className="text-center text-xs">
                            Remember your password?{' '}
                            <Link to="/auth" className="text-cyan-400 hover:underline">
                                Sign in instead
                            </Link>
                        </p>
                    )}
                </CardFooter>
            </Card>

            {/* Support Information */}
            <div className="mt-6 text-center text-sm text-gray-400 max-w-md space-y-2">
                <p>
                    Having trouble? Contact support at{' '}
                    <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
                        support@mapleaurum.com
                    </a>
                </p>
                
                {loading && (
                    <p className="text-xs animate-pulse">
                        Please do not close this window while we update your password...
                    </p>
                )}
            </div>
        </div>
    );
}