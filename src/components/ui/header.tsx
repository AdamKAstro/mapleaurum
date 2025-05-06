// src/components/ui/header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { useFilters } from '../../contexts/filter-context'; // Only needed if displaying tier
import { useAuth } from '../../contexts/auth-context'; // Import useAuth
import { CurrencySelector } from '../../components/currency-selector';
import { Button } from './button'; // Assuming Button component exists
import { LogIn, LogOut, UserCircle, Loader2 } from 'lucide-react'; // Icons

export function Header() {
    // const { currentUserTier } = useFilters(); // Keep if you plan to display tier badge
    const { user, signOut, isLoading: isAuthLoading, session } = useAuth(); // Get auth state and functions
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const { error } = await signOut();
        setIsLoggingOut(false);
        if (error) {
            console.error("Logout failed:", error.message);
            // Optionally show an error message to the user
        } else {
            navigate('/'); // Redirect to home page after successful logout
        }
    };

    return (
        <header className="sticky top-0 z-40 w-full border-b border-navy-300/20 bg-navy-500/95 backdrop-blur supports-[backdrop-filter]:bg-navy-500/60">
            <div className="container flex h-14 items-center justify-between mx-auto px-4">
                {/* Brand / Logo */}
                <div className="mr-4 flex">
                    <Link className="mr-6 flex items-center gap-2" to="/">
                        <img
                            src="/new-logo.png" // Ensure this path is correct
                            alt="Maple Aurum Logo"
                            className="h-8 w-8 object-contain" // Adjusted size slightly
                        />
                        <span className="font-bold text-surface-white hidden sm:inline-block">
                            Maple Aurum
                        </span>
                    </Link>
                </div>

                {/* Right Side Items */}
                <div className="flex items-center gap-3 md:gap-4">
                    <CurrencySelector />

                    {/* Auth Section */}
                    <div className="flex items-center">
                        {isAuthLoading ? (
                            // Show loader while checking auth status initially
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        ) : user ? (
                            // User is logged in
                            <>
                                <span className="text-xs text-gray-300 mr-3 hidden sm:inline" title={user.email}>
                                    {user.email?.split('@')[0]} {/* Show part of email */}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="border-navy-400 hover:bg-navy-600/50 hover:border-navy-300/50 text-gray-300 hover:text-white"
                                >
                                    {isLoggingOut ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <LogOut className="mr-1.5 h-4 w-4" />
                                    )}
                                    Logout
                                </Button>
                                {/* Optional: Add an Account link/icon */}
                                {/* <Link to="/account" className="ml-2 p-1.5 rounded hover:bg-navy-600/50 text-gray-400 hover:text-white">
                                    <UserCircle className="h-5 w-5" />
                                </Link> */}
                            </>
                        ) : (
                            // User is logged out
                            <Link to="/login">
                                <Button
                                    variant="outline" // Or primary/secondary
                                    size="sm"
                                    className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600"
                                >
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Login
                                </Button>
                            </Link>
                             /* Optional: Add Sign Up Button */
                            /* <Link to="/signup" className="ml-2">
                                <Button variant="primary" size="sm">Sign Up</Button>
                            </Link> */
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}