import React from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button'; // Import Button
import { Link } from 'react-router-dom'; // Import Link
import { CheckCircle, Star, Crown, XCircle, HelpCircle } from 'lucide-react'; // Added icons

// Define tier features - align these with your actual feature gating logic/metric tiers
const tierFeatures = {
    free: {
        name: "Free",
        icon: null,
        color: "text-gray-400",
        description: "Basic access for exploration.",
        features: [
            "View company list & basic profile",
            "Access free-tier metrics (e.g., Market Cap, Cash, Share Price, % Gold/Silver)",
            "Basic filtering by status",
            "Standard data updates",
        ],
        unavailable: [
             "Advanced financial ratios (P/B, P/S, EV/Rev, P/E)",
             "Detailed resource/reserve estimates",
             "Valuation metrics (MC/oz, EV/oz)",
             "Production & Cost data",
             "Advanced filtering (metric ranges)",
             "Scoring / Custom Ranking",
             "Scatter Chart analysis",
             "API Access",
             "Priority Support",
        ]
    },
    pro: { // Assuming 'Pro' corresponds to 'medium' tier key
        name: "Pro",
        icon: Star,
        color: "text-teal-400",
        description: "For active investors needing deeper analysis.",
        features: [
            "All Free features",
            "Access medium-tier metrics (e.g., P/B, P/S, EV/Rev, P/E, Debt, Revenue, Net Income, M&I Resources, Reserves, MC/oz values)",
            "Advanced filtering by metric ranges",
            "Company Scoring / Ranking tool",
            "Scatter Chart analysis tool",
            "Export basic data",
        ],
         unavailable: [
             "Premium financial metrics (FCF, EBITDA)",
             "Premium valuation metrics (EV/oz values)",
             "Detailed cost data (AISC, TCO)",
             "Production forecasts",
             "Advanced Capital Structure details",
             "API Access",
             "Priority Support",
         ]
    },
    premium: { // Assuming 'Premium' corresponds to 'premium' tier key
        name: "Premium",
        icon: Crown,
        color: "text-yellow-400",
        description: "Complete access for professionals.",
        features: [
            "All Pro features",
            "Access all premium-tier metrics (e.g., FCF, EBITDA, EV/oz, AISC, Future Production, ITM Options)",
            "Full data export capabilities",
            "API Access (subject to usage limits)",
            "Priority support",
            "Early access to new features",
        ],
        unavailable: [] // No features unavailable at premium
    },
};

export function HelpTiersPage() {
    const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="Subscription Tiers"
            description="Compare features available in each plan."
        >
            <div className="relative isolate">
                 <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
                 <div className="relative z-0 space-y-6 text-gray-300 max-w-5xl mx-auto">

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {Object.values(tierFeatures).map(tier => {
                             const Icon = tier.icon;
                             return (
                                <Card key={tier.name} className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm flex flex-col">
                                     <CardHeader className="border-b border-navy-600 pb-4">
                                         <CardTitle className={`text-xl font-bold flex items-center gap-2 ${tier.color}`}>
                                             {Icon && <Icon size={24} />}
                                             {tier.name}
                                         </CardTitle>
                                         <p className="text-sm text-gray-400 pt-1">{tier.description}</p>
                                     </CardHeader>
                                     <CardContent className="pt-6 space-y-4 flex-grow">
                                         <div>
                                             <h4 className="font-semibold text-gray-100 mb-2">Included Features:</h4>
                                             <ul className="space-y-2">
                                                 {tier.features.map(feature => (
                                                     <li key={feature} className="flex items-start gap-2">
                                                         <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                                                         <span className="text-sm">{feature}</span>
                                                     </li>
                                                 ))}
                                             </ul>
                                         </div>
                                          {tier.unavailable && tier.unavailable.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-navy-700/50">
                                                 <h4 className="font-semibold text-gray-400 mb-2">Not Included:</h4>
                                                 <ul className="space-y-2">
                                                    {tier.unavailable.map(feature => (
                                                         <li key={feature} className="flex items-start gap-2 opacity-60">
                                                             <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                             <span className="text-sm text-gray-500">{feature}</span>
                                                         </li>
                                                     ))}
                                                 </ul>
                                             </div>
                                         )}
                                     </CardContent>
                                 </Card>
                             );
                         })}
                    </div>

                     <div className="text-center mt-10">
                         <Link to="/subscribe">
                             <Button size="lg" className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold px-8 py-3">
                                 View Subscription Plans
                             </Button>
                         </Link>
                     </div>

                 </div>
            </div>
        </PageContainer>
    );
}