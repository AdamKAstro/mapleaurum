// src/components/ui/header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context'; // Import useAuth
import { useSubscription } from '../../contexts/subscription-context'; // Import useSubscription
import { getTierLabel } from '../../lib/tier-utils'; // Import tier label helper
import { CurrencySelector } from '../../components/currency-selector';
import { Button } from './button';
import { LogIn, LogOut, UserCircle, Loader2, ShieldCheck, Star, Crown } from 'lucide-react'; // Added tier icons

// Helper component for Tier Badge
const TierBadge: React.FC<{ tier: 'free' | 'medium' | 'premium' }> = ({ tier }) => {
  const label = getTierLabel(tier);
  let Icon = ShieldCheck;
  let colorClasses = "bg-gray-500/20 text-gray-300 border-gray-600"; // Default (Free)

  if (tier === 'medium') {
    Icon = Star; // Pro Icon
    colorClasses = "bg-teal-500/10 text-teal-300 border-teal-700/50";
  } else if (tier === 'premium') {
    Icon = Crown; // Premium Icon
    colorClasses = "bg-yellow-500/10 text-yellow-300 border-yellow-700/50";
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colorClasses}`}>
       <Icon className="mr-1 h-3 w-3" />
      {label}
    </span>
  );
};


export function Header() {
    const { user, signOut, isLoading: isAuthLoading } = useAuth(); // Get auth state
    const { getEffectiveTier, isLoading: isSubLoading } = useSubscription(); // Get subscription state
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleLogout = async () => {
      // ... (logout logic remains the same)
        setIsLoggingOut(true);
        const { error } = await signOut();
        setIsLoggingOut(false);
        if (error) {
            console.error("Logout failed:", error.message);
        } else {
            navigate('/');
        }
    };

    const currentTier = getEffectiveTier(); // Get the current effective tier

    return (
        <header className="sticky top-0 z-40 w-full border-b border-navy-300/20 bg-navy-500/95 backdrop-blur supports-[backdrop-filter]:bg-navy-500/60">
            <div className="container flex h-14 items-center justify-between mx-auto px-4">
                {/* Brand / Logo */}
                <div className="mr-4 flex">
                    {/* ... Logo Link ... */}
                     <Link className="mr-6 flex items-center gap-2" to="/">
                        <img src="/new-logo.png" alt="Maple Aurum Logo" className="h-8 w-8 object-contain" />
                        <span className="font-bold text-surface-white hidden sm:inline-block"> Maple Aurum </span>
                    </Link>
                </div>

                {/* Right Side Items */}
                <div className="flex items-center gap-3 md:gap-4">
                    <CurrencySelector />

                    {/* Auth Section */}
                    <div className="flex items-center gap-3"> {/* Added gap here */}
                        {isAuthLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        ) : user ? (
                            // User is logged in
                            <>
                                {/* --- TIER BADGE --- */}
                                {!isSubLoading && (
                                    <TierBadge tier={currentTier} />
                                )}
                                {/* --- END TIER BADGE --- */}

                                <span className="text-xs text-gray-300 hidden sm:inline" title={user.email}>
                                    {user.email?.split('@')[0]}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                    className="border-navy-400 hover:bg-navy-600/50 hover:border-navy-300/50 text-gray-300 hover:text-white"
                                >
                                    {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-1.5 h-4 w-4" />}
                                    Logout
                                </Button>
                                {/* Optional Account Link */}
                                {/* <Link to="/account">...</Link> */}
                            </>
                        ) : (
                            // User is logged out
                            <Link to="/login">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600"
                                >
                                    <LogIn className="mr-1.5 h-4 w-4" />
                                    Login
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}