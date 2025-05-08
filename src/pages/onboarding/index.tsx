// src/pages/onboarding/index.tsx
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

export function OnboardingPage() {
    const navigate = useNavigate();
    return (
        <PageContainer title="Welcome to MapleAurum!" description="Start exploring Canadian miners with your new subscription.">
            <div className="text-center max-w-2xl mx-auto">
                <Typography variant="h3" className="mb-4">Your Subscription is Active!</Typography>
                <Typography variant="body" className="mb-6">Dive into powerful analytics and compare miners like never before.</Typography>
                <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            </div>
        </PageContainer>
    );
}