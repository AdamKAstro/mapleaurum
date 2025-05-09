// src/components/ui/header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
// import { getTierLabel } from '../../lib/tier-utils'; // Assuming this maps 'pro' to "Pro" etc.
import { CurrencySelector } from '../../components/currency-selector'; // Make sure path is correct
import { Button } from './button';
import { LogIn, LogOut, Loader2, ShieldCheck, Star, Crown, UserCircle, Settings, FileText, HelpCircle } from 'lucide-react';
import { MapleLeaf } from './mapleleaf'; // Your custom logo component
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu"; // Assuming path is correct
import type { SubscriptionTier } from '../../lib/types'; // Ensure this is 'free' | 'pro' | 'premium'

// Updated TierBadge to use 'pro' and match SubscriptionTier type
const TierBadge: React.FC<{ tier: SubscriptionTier; isLoading?: boolean }> = ({ tier, isLoading }) => {
  if (isLoading) {
    return (
      <span className="inline-flex items-center rounded-md border border-gray-600 bg-gray-700/50 px-2 py-0.5 text-xs font-medium text-gray-400">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Loading Tier...
      </span>
    );
  }

  const getTierLabel = (t: SubscriptionTier): string => {
    switch (t) {
      case 'free': return 'Free';
      case 'pro': return 'Pro';
      case 'premium': return 'Premium';
      default: return 'Unknown';
    }
  };

  const label = getTierLabel(tier);
  let Icon = ShieldCheck;
  let colorClasses = "bg-gray-500/20 text-gray-300 border-gray-600"; // Default (Free)

  if (tier === 'pro') { // Changed from 'medium'
    Icon = Star;
    colorClasses = "bg-teal-500/10 text-teal-300 border-teal-700/50";
  } else if (tier === 'premium') {
    Icon = Crown;
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
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  // FIXED: Use currentUserSubscriptionTier directly. It's the effective tier.
  const { currentUserSubscriptionTier, isLoading: isSubLoading } = useSubscription();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await signOut(); // signOut from useAuth
    setIsLoggingOut(false);
    if (error) {
      console.error("Logout failed:", error.message);
      // Optionally show a toast notification for logout failure
    } else {
      navigate('/'); // Redirect to home or login page after successful logout
    }
  };

  // currentUserSubscriptionTier IS the effective tier value ('free', 'pro', or 'premium')
  const currentEffectiveTier: SubscriptionTier = currentUserSubscriptionTier;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-navy-300/20 bg-navy-500/95 backdrop-blur supports-[backdrop-filter]:bg-navy-500/60">
      <div className="container flex h-16 items-center justify-between mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-2xl">
        {/* Brand / Logo */}
        <div className="mr-4 flex">
          <Link className="mr-6 flex items-center gap-2" to="/">
            {/* Assuming MapleLeaf is your SVG/image component for the logo */}
            <MapleLeaf className="h-8 w-8 text-white" /> 
            <span className="font-bold text-xl text-surface-white hidden sm:inline-block">MapleAurum</span>
          </Link>
        </div>

        {/* Navigation Links - Example Structure */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
          <Link to="/companies" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Companies</Link>
          <Link to="/screener" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Screener</Link>
          {(currentEffectiveTier === 'pro' || currentEffectiveTier === 'premium') && !isAuthLoading && !isSubLoading && (
             <Link to="/analytics-tools" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Analytics Tools</Link>
          )}
        </nav>

        {/* Right Side Items */}
        <div className="flex items-center gap-3 md:gap-4">
          <CurrencySelector /> {/* Assuming this component exists and works */}

          {/* Auth Section */}
          <div className="flex items-center">
            {isAuthLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-navy-400/50 p-0">
                    <UserCircle className="h-7 w-7 text-gray-300 hover:text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 bg-navy-600 border-navy-500 text-gray-200 shadow-xl" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal pb-1">
                    <div className="flex flex-col space-y-1 p-1">
                      <p className="text-sm font-medium leading-none text-white truncate">
                        {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account'}
                      </p>
                      <p className="text-xs leading-none text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-navy-500/50 my-1" />
                  <div className="px-2 py-1.5"> {/* Wrapper for TierBadge with padding */}
                    <TierBadge tier={currentEffectiveTier} isLoading={isSubLoading} />
                  </div>
                  <DropdownMenuSeparator className="bg-navy-500/50 my-1" />
                  <DropdownMenuItem onClick={() => navigate('/account/profile')} className="hover:bg-navy-500 focus:bg-navy-500 cursor-pointer text-sm py-2">
                    <UserCircle className="mr-2 h-4 w-4 opacity-80" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account/billing')} className="hover:bg-navy-500 focus:bg-navy-500 cursor-pointer text-sm py-2">
                      <FileText className="mr-2 h-4 w-4 opacity-80" />
                      <span>Billing & Subscription</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account/settings')} className="hover:bg-navy-500 focus:bg-navy-500 cursor-pointer text-sm py-2">
                    <Settings className="mr-2 h-4 w-4 opacity-80" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-navy-500/50 my-1" />
                  <DropdownMenuItem onClick={() => navigate('/subscribe')} className="hover:bg-navy-500 focus:bg-navy-500 cursor-pointer text-sm py-2">
                      <Crown className="mr-2 h-4 w-4 opacity-80 text-yellow-400" /> {/* Example icon */}
                      <span>Upgrade Plan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/help-center')} className="hover:bg-navy-500 focus:bg-navy-500 cursor-pointer text-sm py-2">
                      <HelpCircle className="mr-2 h-4 w-4 opacity-80" />
                      <span>Help Center</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-navy-500/50 my-1" />
                  <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="hover:bg-red-700/80 focus:bg-red-700/80 text-red-300 focus:text-white cursor-pointer text-sm py-2">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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