// src/pages/help/scoring-guide.tsx (Corrected)
import React from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button'; // Import Button for examples
import { Calculator, SlidersHorizontal, ListOrdered, Info, ChevronsDown, ChevronsUp, Lock } from 'lucide-react';

export function HelpScoringPage() {
    const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="Guide: Using the Scoring Page"
            description="Learn how to create custom company rankings based on weighted metrics."
        >
            <div className="relative isolate">
                 <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
                 <div className="relative z-0 space-y-6 text-gray-300 max-w-3xl mx-auto">
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                               <Calculator size={20} /> Scoring Page Overview
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                             <p>The Scoring page allows you to assign importance (weights) to different company metrics to generate a custom ranking score for each company.</p>
                             <p>This helps you identify companies that perform well according to the criteria *you* define.</p>
                             <p>The companies available for scoring are determined by the filters set on the Filter page.</p>
                         </CardContent>
                     </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 <SlidersHorizontal size={20} /> Metric Weights Card
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                            <p>This section contains sliders for various metrics, grouped by category.</p>
                            <p>Each slider represents the weight (0% to 100%) you assign to that metric. A higher weight means the metric has a greater influence on the final score.</p>
                            <p>Only metrics accessible under your current subscription tier can be adjusted. Inaccessible metrics will not have a slider shown.</p>
                            <p>Hover over the <Info size={14} className="inline align-baseline text-gray-400 mx-1"/> icon next to each metric name to see a detailed description.</p>
                            <p>Use the <Button variant="outline" size="xs" className="pointer-events-none mx-1"><ChevronsUp className="h-3 w-3 mr-1"/> Set Max</Button> and <Button variant="outline" size="xs" className="pointer-events-none mx-1"><ChevronsDown className="h-3 w-3 mr-1"/> Set Min</Button> buttons at the top of the card to quickly set all accessible sliders to 100% or 0%, respectively.</p>
                         </CardContent>
                     </Card>

                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 <ListOrdered size={20} /> Ranked Companies Card
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                            <p>This card displays the list of companies (from the filtered dataset) ranked according to the score calculated based on your current metric weights.</p>
                            <p>Companies with higher scores appear first. The score itself is a relative value based on how well a company performs across the weighted metrics compared to other companies in the current dataset.</p>
                            <p>A score of 'N/A' might appear if a company lacks sufficient data for the weighted metrics or if calculation resulted in null.</p>
                            <p>You can use the <span className="font-semibold text-white">Status Filter</span> dropdown at the top of this card to show only companies of a specific status (Producer, Developer, etc.) within the ranked list. This filter only affects this display and does not change the underlying dataset or global filters.</p>
                         </CardContent>
                     </Card>

                      <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 How Scores are Calculated (Simplified)
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                             {/* --- FIX: Replaced > with &gt; --- */}
                             <p>1. For each metric with a weight &gt; 0, the raw company value is normalized to a scale (typically 0 to 1) based on the range of values across all companies in the current dataset. Whether higher or lower raw values get a better normalized score depends on the metric (e.g., higher Market Cap is better, lower Debt is better).</p>
                             {/* --------------------------------- */}
                             <p>2. This normalized value is multiplied by the weight you assigned to that metric.</p>
                             <p>3. The weighted scores for all included metrics are summed up.</p>
                             <p>4. This sum is divided by the total weight assigned (sum of weights for all included metrics) to get an average weighted score.</p>
                             <p>5. This average is often scaled (e.g., multiplied by 1000) to produce the final displayed score.</p>
                         </CardContent>
                     </Card>

                 </div>
            </div>
        </PageContainer>
    );
}