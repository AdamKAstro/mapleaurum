// src/pages/login/index.tsx
import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button'; // Assuming you have these components
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Typography } from '../../components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'; // Assuming Alert component
import { AlertCircle, LogIn } from 'lucide-react'; // Icons

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signIn, session, isLoading: isAuthLoading } = useAuth(); // Use session to redirect if already logged in
    const navigate = useNavigate();

    // Redirect if user is already logged in
    useEffect(() => {
        if (session) {
            navigate('/companies'); // Or '/' or a dashboard page
        }
    }, [session, navigate]);

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: signInError } = await signIn({ email, password });

        if (signInError) {
            setError(signInError.message || 'An unknown error occurred during sign in.');
        } else {
            // Login was successful, onAuthStateChange listener in AuthProvider
            // will update the session state. We can navigate away.
            // Optional: Show a success message briefly before navigating
             navigate('/companies'); // Navigate to a relevant page after login
        }

        setLoading(false);
    };

    // Don't render the form if already logged in (during redirect phase)
    if (session || isAuthLoading) {
        return (
             <div className="flex items-center justify-center h-screen">
                <Typography variant="h3" className="text-white">Loading...</Typography>
             </div>
         ); // Or a proper loading spinner
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4">
             {/* Optional: Add background image/noise like other pages if desired */}
             {/* <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" /> */}
             {/* <div className="absolute inset-0 bg-noise opacity-[0.07] -z-10" aria-hidden="true" /> */}

            <Card className="w-full max-w-md bg-navy-700/60 border-navy-600/50 text-white backdrop-blur-sm shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-cyan-300">Welcome Back</CardTitle>
                    <CardDescription className="text-gray-300">Sign in to access your Maple Aurum account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                         {error && (
                             <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Login Failed</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                         )}
                        <div className="space-y-1">
                            <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
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
                        <div className="space-y-1">
                             <label htmlFor="password" className="text-sm font-medium text-gray-300">Password</label>
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
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:opacity-70"
                            disabled={loading}
                        >
                            {loading ? 'Signing In...' : (
                                <>
                                <LogIn className="mr-2 h-4 w-4" /> Sign In
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                 <CardFooter className="flex flex-col items-center text-sm text-gray-400 pt-4">
                     {/* Optional: Add links for Sign Up or Password Reset if you implement them */}
                     {/* <p>
                        Don't have an account?{' '}
                        <Link to="/signup" className="font-medium text-cyan-400 hover:text-cyan-300">
                            Sign Up
                        </Link>
                    </p> */}
                     {/* <p className="mt-2">
                        <Link to="/forgot-password" className="font-medium text-cyan-400 hover:text-cyan-300">
                            Forgot Password?
                        </Link>
                    </p> */}
                </CardFooter>
            </Card>
        </div>
    );
}