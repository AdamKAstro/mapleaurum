import React from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Filter, SlidersHorizontal, RotateCcw, Lock } from 'lucide-react';

export function HelpFiltersPage() {
     const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="Guide: Using Filters"
            description="Learn how to select specific companies using status and metric ranges."
        >
             <div className="relative isolate">
                 <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
                 <div className="relative z-0 space-y-6 text-gray-300 max-w-3xl mx-auto">
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                               <Filter size={20} /> Filter Page Overview
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                             <p>The Filter page allows you to narrow down the list of companies based on their development status and specific financial or operational metrics.</p>
                             <p>Any filters you apply here will automatically update the data shown on the Companies table, Scoring page, and Scatter Chart.</p>
                         </CardContent>
                     </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 Status Buttons
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                            <p>Click on the status buttons (e.g., <span className="font-semibold text-white">Producer</span>, <span className="font-semibold text-white">Developer</span>) at the top of the Filter page to include or exclude companies with that status.</p>
                            <p>Multiple statuses can be selected simultaneously. If no statuses are selected, companies of all statuses (matching other filters) will be included.</p>
                             <p>The status filter you select here also applies directly to the Companies page table.</p>
                         </CardContent>
                     </Card>

                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 <SlidersHorizontal size={20} /> Metric Range Sliders
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                            <p>Below the status buttons, you'll find sliders for various metrics, grouped by category.</p>
                             <p>Drag the handles on a slider to set the minimum and maximum acceptable range for that metric. Only companies falling within the selected range for *all* active sliders will be included.</p>
                             <p>Some metrics may require a specific subscription tier (<strong className="text-yellow-400">Pro</strong> or <strong className="text-yellow-300">Premium</strong>). Sliders for inaccessible metrics will be disabled and show a <Lock size={12} className="inline align-baseline text-yellow-500 mx-1" /> icon.</p>
                             <p>If a metric (like Share Price) doesn't have a meaningful range to filter by, it will show "Range N/A" and won't have a slider.</p>
                             <p>The "Show All Sliders" toggle allows you to view all available metric sliders, including those locked by your current tier.</p>
                         </CardContent>
                     </Card>

                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 <RotateCcw size={20} /> Resetting Filters
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                             <p>To clear all applied status and metric range filters, click the "Reset Filters" button located in the top-right navigation area (provided by the page container).</p>
                            <p>This will restore the view to include all companies (subject only to the default search term, if any).</p>
                         </CardContent>
                     </Card>

                 </div>
             </div>
        </PageContainer>
    );
}