//src/pages/account/profile.tsx

import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Typography } from '../../components/ui/typography';
import { Loader2, User, Mail, KeyRound, Gem, Star, ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import type { SubscriptionTier } from '../../lib/types';

// Re-using the TierBadge logic from the Header for consistency
const TierBadge: React.FC<{ tier: SubscriptionTier }> = ({ tier }) => {
    const getTierDetails = (t: SubscriptionTier) => {
        switch (t) {
            case 'pro':
                return { label: 'Pro', Icon: Star, color: 'text-teal-300' };
            case 'premium':
                return { label: 'Premium', Icon: Gem, color: 'text-yellow-300' };
            default:
                return { label: 'Free', Icon: ShieldCheck, color: 'text-gray-300' };
        }
    };

    const { label, Icon, color } = getTierDetails(tier);

    return (
        <div className={`flex items-center gap-2 text-lg font-semibold ${color}`}>
            <Icon className="h-5 w-5" />
            <span>{label} Tier</span>
        </div>
    );
};


export function ProfilePage() {
    const { user, updatePassword, isLoading: isAuthLoading } = useAuth();
    const { currentUserSubscriptionTier, isLoading: isSubLoading } = useSubscription();
    const navigate = useNavigate();

    // State for user profile updates
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // State for password updates
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            navigate('/login');
        }
        setFullName(user?.user_metadata?.full_name || '');
    }, [user, isAuthLoading, navigate]);

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileMessage(null);

        // This assumes you have an `updateUser` method in your auth context.
        // If not, you'll need to add it to call `supabase.auth.updateUser`.
        // For now, this part is commented out until that's confirmed.
        /*
        const { error } = await updateUser({ data: { full_name: fullName } });

        if (error) {
            setProfileMessage({ type: 'error', text: `Failed to update profile: ${error.message}` });
        } else {
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        }
        */

        // Placeholder until updateUser is implemented:
        setTimeout(() => {
             setProfileMessage({ type: 'success', text: 'Profile updated successfully! (Frontend Only)' });
             setIsSavingProfile(false);
        }, 1000);
    };

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (password.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
            return;
        }

        setIsSavingPassword(true);
        setPasswordMessage(null);

        const { error } = await updatePassword(password);

        if (error) {
            setPasswordMessage({ type: 'error', text: `Failed to update password: ${error.message}` });
        } else {
            setPasswordMessage({ type: 'success', text: 'Password updated successfully!' });
            setPassword('');
            setConfirmPassword('');
        }
        setIsSavingPassword(false);
    };

    if (isAuthLoading || isSubLoading) {
        return (
            <PageContainer title="Loading Profile..." description="Fetching your account details.">
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
                </div>
            </PageContainer>
        );
    }

    if (!user) {
        return (
             <PageContainer title="Unauthorized" description="Please log in to view your profile.">
                <div className="text-center">
                    <Typography variant="h3" className="text-red-400">Access Denied</Typography>
                    <Button onClick={() => navigate('/login')} className="mt-4">Go to Login</Button>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Account Profile"
            description="Manage your profile details, security settings, and subscription."
        >
            <Helmet>
                <title>My Profile - MapleAurum</title>
                <meta name="description" content="View and manage your MapleAurum account profile and subscription details." />
            </Helmet>

            <div className="relative isolate">
                 <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
                    style={{ backgroundImage: `url('/Background2.jpg')` }}
                    aria-hidden="true"
                />
                <div className="relative z-0 space-y-8 max-w-3xl mx-auto">
                    {/* --- Profile Details Card --- */}
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <form onSubmit={handleProfileUpdate}>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                    <User size={18} />
                                    Profile Details
                                </CardTitle>
                                <CardDescription className="text-gray-400">
                                    This information is not public.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        className="bg-navy-700/50 border-navy-600 text-white"
                                        disabled
                                    />
                                    <p className="text-xs text-yellow-400/80 flex items-center gap-1.5 pt-1"><AlertTriangle size={14}/> Functionality to update name is currently disabled.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={user.email || ''}
                                        disabled
                                        className="bg-navy-900/50 border-navy-700 text-gray-400 cursor-not-allowed"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                {profileMessage && (
                                    <Typography variant="bodySmall" className={profileMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                        {profileMessage.text}
                                    </Typography>
                                )}
                                <Button type="submit" disabled={isSavingProfile || true} className="ml-auto">
                                    {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* --- Security Card --- */}
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <form onSubmit={handlePasswordUpdate}>
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                    <KeyRound size={18} />
                                    Security
                                </CardTitle>
                                 <CardDescription className="text-gray-400">
                                    Update your password here.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                         className="bg-navy-700/50 border-navy-600 text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                         className="bg-navy-700/50 border-navy-600 text-white"
                                    />
                                </div>
                            </CardContent>
                             <CardFooter className="flex justify-between items-center">
                                {passwordMessage && (
                                    <Typography variant="bodySmall" className={passwordMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                        {passwordMessage.text}
                                    </Typography>
                                )}
                                <Button type="submit" disabled={isSavingPassword} className="ml-auto">
                                    {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* --- Subscription Card --- */}
                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                <ShieldCheck size={18}/>
                                Subscription
                            </CardTitle>
                             <CardDescription className="text-gray-400">
                                Your current plan and billing information.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TierBadge tier={currentUserSubscriptionTier} />
                        </CardContent>
                        <CardFooter>
                             <Link to="/account/billing" className="w-full">
                                <Button variant="outline" className="w-full border-cyan-700/80 text-cyan-300 hover:bg-cyan-900/30">
                                    Manage Subscription & Billing
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                </Button>
                             </Link>
                        </CardFooter>
                     </Card>
                </div>
            </div>
        </PageContainer>
    );
}