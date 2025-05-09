//src/pages/auth/index.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Typography } from '../../components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { PageContainer } from '../../components/ui/page-container';
import { Mail, Lock } from 'lucide-react';

export function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSignup, setIsSignup] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const signupParam = searchParams.get('signup');
        const emailParam = searchParams.get('email');
        setIsSignup(signupParam === 'true');
        if (emailParam) setEmail(decodeURIComponent(emailParam));
    }, [location.search]);

    const searchParams = new URLSearchParams(location.search);
    const planName = searchParams.get('plan') || 'a plan';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        try {
            const from = (location.state as { from?: string })?.from || `/subscribe?${searchParams.toString()}`;
            console.log('[AuthPage] handleSubmit:', { email, isSignup, from, redirectTo: `${window.location.origin}${from}` });
            if (isSignup) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}${from}`,
                    },
                });
                console.log('[AuthPage] signUp response:', { data, error });
                if (error) throw error;
                if (data.user && !data.user.confirmed_at) {
                    setMessage('Please check your email to confirm your account.');
                    setEmail('');
                    setPassword('');
                } else {
                    console.log('[AuthPage] User signed up successfully:', data.user?.id);
                    navigate(from);
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                console.log('[AuthPage] signIn response:', { data, error });
                if (error) throw error;
                console.log('[AuthPage] User logged in successfully:', data.user?.id);
                navigate(from);
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
            className="flex items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900"
        >
            <div className="w-full max-w-md bg-navy-700/60 border-navy-600/50 text-white backdrop-blur-sm shadow-xl p-6 rounded-lg">
                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {message && (
                    <Alert variant="success" className="mb-6">
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{message}</AlertDescription>
                    </Alert>
                )}
                <div className="flex justify-center mb-4">
                    <Button
                        variant={isSignup ? 'default' : 'outline'}
                        onClick={() => setIsSignup(true)}
                        className="mr-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
                        disabled={loading}
                    >
                        Sign Up
                    </Button>
                    <Button
                        variant={isSignup ? 'outline' : 'default'}
                        onClick={() => setIsSignup(false)}
                        className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600"
                        disabled={loading}
                    >
                        Log In
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Typography variant="label" className="text-gray-300">Email</Typography>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                                className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Typography variant="label" className="text-gray-300">Password</Typography>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                className="pl-10 bg-navy-600/80 border-navy-500 placeholder-gray-400 text-white"
                            />
                        </div>
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
                    >
                        {loading ? (isSignup ? 'Signing up...' : 'Logging in...') : (isSignup ? 'Sign Up' : 'Log In')}
                    </Button>
                </form>
            </div>
        </PageContainer>
    );
}