import React from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LineChart, Axis3d, Settings, Scale, ZoomIn, ZoomOut, RotateCcw, FilterX, MousePointerSquareDashed, Palette, MessageSquareQuote, Lock } from 'lucide-react'; // Added ZoomOut
import { Button } from '../../components/ui/button'; // For visual example

export function HelpScatterPage() {
    const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="Guide: Using the Scatter Chart"
            description="Learn how to visualize relationships between company metrics."
        >
            <div className="relative isolate">
                 <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
                 <div className="relative z-0 space-y-6 text-gray-300 max-w-3xl mx-auto">
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                               <LineChart size={20} /> Scatter Chart Overview
                            </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-3 text-sm">
                             <p>The Scatter Chart page is a powerful tool for visually exploring potential correlations and patterns between three different company metrics simultaneously.</p>
                             <p>It plots companies based on two metrics (X and Y axes) and uses the size of the bubble to represent a third metric (Z-axis).</p>
                             <p>Like other pages, the companies shown on this chart are based on the filters currently active in the Filter Context (set via the Filter page or the global Reset button).</p>
                         </CardContent>
                     </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 <Settings size={20} /> Chart Controls
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4 text-sm">
                            <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1"><Axis3d size={16} /> Axis & Size Selection:</h4>
                                <p>Use the dropdown menus labeled "X Axis", "Y Axis", and "Bubble Size" to choose which metrics you want to compare. The list includes all metrics accessible under your current subscription tier. Selecting metrics requiring a higher tier will show a locked state until you upgrade.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1"><Scale size={16} /> Scale Toggles:</h4>
                                <p>For the X, Y, and Size axes, you can switch between "Linear" and "Log" scales. Logarithmic scales are particularly useful when dealing with metrics that have a very wide range of values (like Market Cap or Resources), as they compress the higher end, making it easier to see variations among smaller values.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1"><ZoomIn size={16} /> Zoom & Pan:</h4>
                                <p>You can zoom in and out using your mouse wheel or pinch gestures. Click and drag on the chart area to pan the view. Use the <Button variant="outline" size="icon-xs" className="pointer-events-none mx-1 inline-flex align-middle h-5 w-5 p-0"><ZoomIn size={14}/></Button> / <Button variant="outline" size="icon-xs" className="pointer-events-none mx-1 inline-flex align-middle h-5 w-5 p-0"><ZoomOut size={14}/></Button> buttons in the top-right toolbar for stepped zooming.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1"><RotateCcw size={16} /> Reset Buttons:</h4>
                                <p>The <Button variant="outline" size="icon-xs" className="pointer-events-none mx-1 inline-flex align-middle h-5 w-5 p-0"><RotateCcw size={14}/></Button> button in the chart's toolbar resets only the zoom and pan level. The main <Button variant="outline" size="xs" className="pointer-events-none mx-1 inline-flex align-middle h-6 px-1"><FilterX size={14} className="mr-1"/> Reset Filters</Button> button in the page header (from PageContainer) resets all *data filters* (status, metric ranges) applied via the Filter Context.</p>
                            </div>
                         </CardContent>
                     </Card>

                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                         <CardHeader>
                             <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                 <MousePointerSquareDashed size={20} /> Interpreting the Chart
                             </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4 text-sm">
                            <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">Axes & Position:</h4>
                                <p>A company's horizontal position is determined by the selected X-axis metric, and its vertical position by the Y-axis metric.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">Bubble Size:</h4>
                                <p>The size of each bubble corresponds to the value of the selected Z-axis (Bubble Size) metric for that company, adjusted by the Linear/Log scale chosen for Size.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1"><Palette size={16} /> Bubble Color:</h4>
                                <p>The color of each bubble indicates the company's development status (Producer, Developer, Explorer, Royalty, Other), matching the legend below the chart.</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1"><MessageSquareQuote size={16} /> Tooltips & Labels:</h4>
                                <p>Hover your mouse over any bubble to see a tooltip showing the company's name, ticker, and the exact values for the selected X, Y, and Z metrics. Some larger bubbles may also display the company's ticker symbol directly on the chart for quick identification (this behavior might depend on bubble size).</p>
                            </div>
                             <div>
                                <h4 className="font-semibold text-gray-100 mb-1">Analysis:</h4>
                                <p>Look for patterns, clusters, and outliers. For example, do companies with high values on the X-axis also tend to have high values on the Y-axis (positive correlation)? Are there distinct groups based on color (status)? Are the largest bubbles clustered in one area?</p>
                            </div>
                         </CardContent>
                     </Card>
                 </div>
             </div>
        </PageContainer>
    );
}