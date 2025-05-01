// src/pages/subscribe/index.tsx
import React from 'react';
import { Check, Crown, Star } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { cn } from '../../lib/utils';
import { PageContainer } from '../../components/ui/page-container';
// Removed imports for getTierDescription and getTierFeatures

// --- Hardcoded Pricing Tier Data ---
const pricingTiers = [
    {
        name: "Free",
        price: "$0", // Note: No period for free tier
        description: "Basic access to company data",
        is_popular: false,
        features: [
            "Basic company information",
            "Limited financial metrics",
            "Public company profiles",
            "Daily updates"
        ]
    },
    {
        name: "Pro",
        price: "$35/month",
        description: "Advanced analytics and insights",
        is_popular: true, // Marked as Most Popular
        features: [
            // "All Free features" - REMOVED
            // "Export capabilities" - REMOVED
            "Financial metrics",
            "Resource estimates",
            "Production data",
            "Custom watchlists (coming)"
        ]
    },
    {
        name: "Premium",
        price: "$85/month",
        description: "Complete access and premium features",
        is_popular: false,
        features: [
            "All Pro features",
            "Priority support",
            "Basic company information",
            "Public company profiles",
            "Advanced financial metrics",
            "Resource estimates",
            "Production data",
            "Custom watchlists (coming)",
            "Real-time alerts (coming)",
            "API access (coming)",
            "Cost metrics",
            "Valuation models"
        ]
    }
];

// --- Map hardcoded data to the structure needed by the component ---
// Helper function to split price like "$X/month" into ["$X", "/month"] or ["$0", undefined]
const splitPricePeriod = (priceString: string): [string, string | undefined] => {
    if (priceString.includes('/')) {
        const parts = priceString.split('/');
        return [parts[0], `/${parts[1]}`];
    }
    return [priceString, undefined]; // No period found (e.g., for "$0")
};

const plans = [
 {
   name: pricingTiers[0].name, // 'Free'
   price: splitPricePeriod(pricingTiers[0].price)[0], // '$0'
   period: splitPricePeriod(pricingTiers[0].price)[1], // undefined
   description: pricingTiers[0].description,
   features: pricingTiers[0].features,
   icon: null, // Keep existing display logic
   color: 'gray', // Keep existing display logic
   popular: pricingTiers[0].is_popular, // false
   buttonText: 'Current Plan', // Keep existing display logic
   buttonVariant: 'outline' as const, // Keep existing display logic
   disabled: true, // Keep existing display logic
 },
 {
   name: pricingTiers[1].name, // 'Pro'
   price: splitPricePeriod(pricingTiers[1].price)[0], // '$35'
   period: splitPricePeriod(pricingTiers[1].price)[1], // '/month'
   description: pricingTiers[1].description,
   features: pricingTiers[1].features,
   icon: Star, // Keep existing display logic
   color: 'accent-teal', // Keep existing display logic
   popular: pricingTiers[1].is_popular, // true
   buttonText: 'Start Pro Trial', // Keep existing display logic
   buttonVariant: 'primary' as const, // Keep existing display logic
   disabled: false, // Keep existing display logic
 },
 {
   name: pricingTiers[2].name, // 'Premium'
   price: splitPricePeriod(pricingTiers[2].price)[0], // '$85'
   period: splitPricePeriod(pricingTiers[2].price)[1], // '/month'
   description: pricingTiers[2].description,
   features: pricingTiers[2].features,
   icon: Crown, // Keep existing display logic
   color: 'accent-yellow', // Keep existing display logic
   popular: pricingTiers[2].is_popular, // false
   buttonText: 'Start Premium Trial', // Keep existing display logic
   buttonVariant: 'primary' as const, // Keep existing display logic
   disabled: false, // Keep existing display logic
 },
];

// --- Subscribe Page Component ---
export function SubscribePage() {
 const backgroundImageUrl = '/Background2.jpg';

 return (
   <PageContainer
       title="Subscription Plans"
       description="Choose the plan that best fits your mining analytics needs."
       className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
   >
     <div
       className="absolute inset-0 bg-cover bg-center opacity-50 -z-10"
       style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
       aria-hidden="true"
     />
     <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />

     <div className="relative z-0 pt-8 pb-12">
       <div className="text-center mb-12 md:mb-16">
         <Typography
           variant="h2"
           className="text-surface-white text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight"
         >
           Choose Your Plan
         </Typography>
         <Typography
           variant="body"
           className="mt-3 max-w-2xl mx-auto text-surface-white/70 text-sm sm:text-base"
         >
           Unlock powerful analytics and gain deeper insights into the mining sector.
         </Typography>
       </div>

       <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
         {plans.map((plan) => {
           const Icon = plan.icon;
           return (
             <div
               key={plan.name}
               className={cn(
                   'relative transform transition-all duration-300 hover:scale-[1.015] flex',
                   plan.popular ? 'shadow-cyan-900/20 shadow-lg' : 'shadow-md shadow-navy-900/10'
               )}
             >
               {plan.popular && (
                 <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
                   <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                     Most Popular
                   </span>
                 </div>
               )}
               <div
                 className={cn(
                     'relative flex flex-col h-full rounded-xl border p-6 w-full',
                     plan.popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50',
                     'backdrop-blur-sm'
                 )}
               >
                 <div className="flex items-center gap-3 mb-4">
                   {Icon && (
                     <Icon
                       className={cn(
                           'h-7 w-7',
                           plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal'
                       )}
                     />
                   )}
                   <h3 className={cn('text-lg font-semibold', plan.popular ? 'text-cyan-300' : 'text-white')}>
                     {plan.name}
                   </h3>
                 </div>
                 <div className="mt-2 flex items-baseline gap-x-1">
                   <span className="text-3xl font-bold tracking-tight text-white">{plan.price}</span>
                   {plan.period && (
                     <span className="text-sm font-semibold leading-6 text-gray-400">{plan.period}</span>
                   )}
                 </div>
                 <p className="mt-4 text-sm leading-6 text-gray-300">{plan.description}</p>
                 <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
                   {plan.features.map((feature) => (
                     <li key={feature} className="flex gap-x-3">
                       {/* Use smaller checkmark for features beyond the first "All ..." line */}
                       {/* Adjust logic slightly as 'All ... features' is now the first item */}
                       {feature === 'All Free features' || feature === 'All Pro features' ? (
                         <span className="w-5 h-6"></span> // Placeholder to align text
                       ) : (
                         <Check className="h-6 w-5 flex-none text-teal-400" aria-hidden="true" />
                       )}
                        {/* Display the feature text */}
                       <span className={cn(feature.startsWith('All ') ? 'font-medium text-gray-400 -ml-5' : '')}> {/* Add negative margin to align */}
                         {feature}
                       </span>
                     </li>
                   ))}
                 </ul>
                 <Button
                   disabled={plan.disabled}
                   size="lg"
                   // Use plan.popular to determine the primary variant style for the popular plan
                   variant={plan.disabled ? 'secondary' : plan.popular ? 'primary' : 'outline'}
                   className={cn(
                       'mt-8 w-full font-semibold',
                       // Apply gradient style specifically to the popular, non-disabled button
                       plan.popular && !plan.disabled &&
                       'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white',
                       // Apply outline style to non-popular, non-disabled buttons
                       !plan.popular && !plan.disabled &&
                       'border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600',
                       // Apply disabled styles
                       plan.disabled && 'opacity-60 cursor-not-allowed'
                   )}
                 >
                   {plan.buttonText}
                 </Button>
               </div>
             </div>
           );
         })}
       </div>
     </div>
   </PageContainer>
 );
}