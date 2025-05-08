//src/pages/auth/index.tsx


import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Typography } from '../../components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { PageContainer } from '../../components/ui/page-container';

export function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSignup, setIsSignup] = useState(true); // Default to signup
    const navigate = useNavigate();
    const location = useLocation();

    // Set initial form based on query param
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const signupParam = searchParams.get('signup');
        setIsSignup(signupParam === 'true');
    }, [location.search]);

    // Get plan name for context
    const searchParams = new URLSearchParams(location.search);
    const planName = searchParams.get('plan') || 'a plan';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const from = (location.state as { from?: string })?.from || location.search || '/subscribe';
            if (isSignup) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        redirectTo: `${window.location.origin}${from}`,
                    },
                });
                if (error) throw error;
                if (data.user && !data.user.confirmed_at) {
                    setError('Please check your email to confirm your account.');
                } else {
                    console.log('[AuthPage] User signed up successfully:', data.user?.id);
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                    options: {
                        redirectTo: `${window.location.origin}${from}`,
                    },
                });
                if (error) throw error;
                console.log('[AuthPage] User logged in successfully:', data.user?.id);
            }
        } catch (err: any) {
            console.error('[AuthPage] Auth error:', err);
            setError(err.message || `Failed to ${isSignup ? 'sign up' : 'log in'}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer
            title={isSignup ? 'Sign Up' : 'Log In'}
            description={`Access your MapleAurum ${planName} subscription`}
        >
            <div className="max-w-md mx-auto mt-8">
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <div className="flex justify-center mb-4">
                    <Button
                        variant={isSignup ? 'default' : 'outline'}
                        onClick={() => setIsSignup(true)}
                        className="mr-2"
                        disabled={loading}
                    >
                        Sign Up
                    </Button>
                    <Button
                        variant={isSignup ? 'outline' : 'default'}
                        onClick={() => setIsSignup(false)}
                        disabled={loading}
                    >
                        Log In
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Typography variant="label">Email</Typography>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <Typography variant="label">Password</Typography>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? (isSignup ? 'Signing up...' : 'Logging in...') : (isSignup ? 'Sign Up' : 'Log In')}
                    </Button>
                </form>
            </div>
        </PageContainer>
    );
}