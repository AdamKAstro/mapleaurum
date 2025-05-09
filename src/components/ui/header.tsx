// src/components/ui/header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { CurrencySelector } from '../../components/currency-selector'; // Verify this path is correct
import { Button } from './button'; // Assuming this exists in the same folder
import { LogIn, LogOut, Loader2, ShieldCheck, Star, Gem, UserCircle } from 'lucide-react'; // Gem for premium badge
import type { SubscriptionTier } from '../../lib/types';

// TierBadge component (kept as it was used in your older version and is self-contained here)
const TierBadge: React.FC<{ tier: SubscriptionTier; isLoading?: boolean }> = ({ tier, isLoading }) => {
  if (isLoading) {
    return (
      <span className="inline-flex items-center rounded-md border border-gray-600 bg-gray-700/50 px-2 py-0.5 text-xs font-medium text-gray-400">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Tier
      </span>
    );
  }

  const getTierLabel = (t: SubscriptionTier): string => {
    switch (t) {
      case 'free': return 'Free';
      case 'pro': return 'Pro';
      case 'premium': return 'Premium';
      default: return 'User'; // Fallback
    }
  };

  const label = getTierLabel(tier);
  let IconComponent = ShieldCheck;
  let colorClasses = "bg-gray-500/20 text-gray-300 border-gray-600";

  if (tier === 'pro') {
    IconComponent = Star;
    colorClasses = "bg-teal-500/10 text-teal-300 border-teal-700/50";
  } else if (tier === 'premium') {
    IconComponent = Gem; // Using Gem for Premium badge
    colorClasses = "bg-yellow-500/10 text-yellow-300 border-yellow-700/50";
  }

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colorClasses}`}>
      <IconComponent className="mr-1 h-3 w-3" />
      {label}
    </span>
  );
};

export function Header() {
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  const { currentUserSubscriptionTier, isLoading: isSubLoading } = useSubscription();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await signOut();
    setIsLoggingOut(false);
    if (error) {
      console.error("Logout failed:", error.message);
      // You might want to show a toast notification to the user here
    } else {
      navigate('/'); // Redirect to homepage or login page after logout
    }
  };

  const currentEffectiveTier: SubscriptionTier = currentUserSubscriptionTier;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-300/20 bg-navy-500/95 backdrop-blur supports-[backdrop-filter]:bg-navy-500/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-2xl">
        {/* Logo Section */}
        <div className="mr-4 flex">
          <Link className="mr-6 flex items-center gap-2" to="/">
            <img src="/new-logo.png" alt="Maple Aurum Logo" className="h-8 w-8 object-contain" />
            <span className="font-bold text-xl text-surface-white hidden sm:inline-block">MapleAurum</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
          <Link to="/companies" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Companies</Link>
          <Link to="/screener" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Screener</Link>
          {(!isAuthLoading && !isSubLoading && (currentEffectiveTier === 'pro' || currentEffectiveTier === 'premium')) && (
             <Link to="/analytics-tools" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Analytics Tools</Link>
          )}
        </nav>

        {/* Right Side Items */}
        <div className="flex items-center gap-3 md:gap-4">
          <CurrencySelector /> {/* Assuming this component path is correct and it exists */}

          {/* Auth Section - Simplified */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : user ? (
              <>
                {!isSubLoading && (
                  <Link to="/account/billing" title="View Account & Billing">
                    <TierBadge tier={currentEffectiveTier} isLoading={isSubLoading} />
                  </Link>
                )}
                {isSubLoading && !isAuthLoading && ( // Show a placeholder if sub is loading but auth is done
                    <span className="inline-flex items-center rounded-md border border-gray-600 bg-gray-700/50 px-2 py-0.5 text-xs font-medium text-gray-400">
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" /> User
                    </span>
                )}

                {/* User Profile Icon/Link (Simple version) */}
                <Link to="/account/profile" className="flex items-center gap-2 text-sm text-gray-300 hover:text-white" title={user.email || "User Account"}>
                    <UserCircle className="h-6 w-6" />
                    <span className="hidden sm:inline">
                        {user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                </Link>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="border-navy-400 hover:bg-navy-600/50 hover:border-navy-300/50 text-gray-300 hover:text-white"
                >
                  {isLoggingOut ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogOut className="mr-1.5 h-4 w-4" />}
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/auth')} // Navigate to your combined login/signup page
                variant="outline"
                size="sm"
                className="border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600 hover:text-cyan-200"
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                Login / Sign Up
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}