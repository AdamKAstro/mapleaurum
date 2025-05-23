//src/pages/help/scatter-guide.tsx
import React from 'react';
import { Helmet } from 'react-helmet';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  LineChart,
  Axis3d,
  Settings,
  Scale,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FilterX,
  MousePointerSquareDashed,
  Palette,
  MessageSquareQuote,
  Lock,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';

export function HelpScatterPage() {
  const backgroundImageUrl = '/Background2.jpg';

  return (
    <PageContainer
      title="Guide: Using the Scatter Chart"
      description="Learn how to visualize relationships between company metrics."
    >
      <Helmet>
        <title>MapleAurum | Scatter Chart Guide</title>
        <meta
          name="description"
          content="Learn how to use the Scatter Chart to visualize relationships between company metrics and identify patterns."
        />
      </Helmet>
      <div className="relative isolate">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
          style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
          aria-hidden="true"
        />
        <div
          className={cn(
            'relative z-0 space-y-6 text-gray-300',
            'max-w-4xl mx-auto',
            'prose prose-sm sm:prose-base prose-invert',
            'prose-headings:text-cyan-400 prose-headings:font-semibold',
            'prose-a:text-accent-teal hover:prose-a:text-accent-yellow',
            'prose-strong:text-surface-white'
          )}
        >
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <LineChart size={24} className="text-cyan-400" />
                Scatter Chart Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                The Scatter Chart page is a powerful tool for visually exploring potential correlations and patterns between
                three different company metrics simultaneously.
              </p>
              <p>
                It plots companies based on two metrics (X and Y axes) and uses the size of the bubble to represent a third
                metric (Z-axis). This allows you to analyze relationships between metrics like Market Cap, P/E Ratio, and Gold
                Production in a single view.
              </p>
              <p>
                Like other pages, the companies shown on this chart are based on the filters currently active in the Filter
                Context (set via the Filter page or the global Reset button).
              </p>
              <div className="bg-navy-900/40 border-l-4 border-accent-teal p-4 rounded-r-md">
                <p className="font-semibold text-surface-white mb-2">Key Feature:</p>
                <p className="text-xs">
                  The Scatter Chart lets you quickly identify outliers, clusters, and trends across multiple dimensions,
                  helping you spot investment opportunities or risks.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Settings size={24} className="text-cyan-400" />
                Chart Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                  <Axis3d size={16} />
                  Axis & Size Selection
                </h4>
                <p>
                  Use the dropdown menus labeled "X Axis", "Y Axis", and "Bubble Size" to choose which metrics you want to
                  compare. The list includes all metrics accessible under your current subscription tier. Selecting metrics
                  requiring a higher tier will show a locked state (
                  <Lock size={14} className="inline mx-1 text-gray-400" />) until you upgrade.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                  <Scale size={16} />
                  Scale Toggles
                </h4>
                <p>
                  For the X, Y, and Size axes, you can switch between "Linear" and "Log" scales. Logarithmic scales are
                  particularly useful for metrics with a wide range of values (e.g., Market Cap or Resources), as they
                  compress the higher end, making it easier to see variations among smaller values.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                  <ZoomIn size={16} />
                  Zoom & Pan
                </h4>
                <p>
                  Zoom in and out using your mouse wheel or pinch gestures. Click and drag on the chart area to pan the view.
                  Use the{' '}
                  <Button
                    variant="outline"
                    size="icon-xs"
                    className="pointer-events-none mx-1 inline-flex align-middle h-5 w-5 p-0"
                  >
                    <ZoomIn size={14} />
                  </Button>{' '}
                  /{' '}
                  <Button
                    variant="outline"
                    size="icon-xs"
                    className="pointer-events-none mx-1 inline-flex align-middle h-5 w-5 p-0"
                  >
                    <ZoomOut size={14} />
                  </Button>{' '}
                  buttons in the top-right toolbar for stepped zooming.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                  <RotateCcw size={16} />
                  Reset Buttons
                </h4>
                <p>
                  The{' '}
                  <Button
                    variant="outline"
                    size="icon-xs"
                    className="pointer-events-none mx-1 inline-flex align-middle h-5 w-5 p-0"
                  >
                    <RotateCcw size={14} />
                  </Button>{' '}
                  button in the chart’s toolbar resets only the zoom and pan level. The main{' '}
                  <Button
                    variant="outline"
                    size="xs"
                    className="pointer-events-none mx-1 inline-flex align-middle h-6 px-1"
                  >
                    <FilterX size={14} className="mr-1" /> Reset Filters
                  </Button>{' '}
                  button in the page header (from PageContainer) resets all <em>data filters</em> (status, metric ranges)
                  applied via the Filter Context.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <MousePointerSquareDashed size={24} className="text-cyan-400" />
                Interpreting the Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">Axes & Position</h4>
                <p>
                  A company’s horizontal position is determined by the selected X-axis metric, and its vertical position by
                  the Y-axis metric. For example, plotting Market Cap (X) vs. P/E Ratio (Y) shows how valuation correlates
                  with company size.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">Bubble Size</h4>
                <p>
                  The size of each bubble corresponds to the value of the selected Z-axis (Bubble Size) metric, adjusted by
                  the Linear/Log scale. For instance, a larger bubble for Gold Production (Z) indicates higher output.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                  <Palette size={16} />
                  Bubble Color
                </h4>
                <p>
                  The color of each bubble indicates the company’s development status (Producer, Developer, Explorer, Royalty,
                  Other), matching the legend below the chart.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                  <MessageSquareQuote size={16} />
                  Tooltips & Labels
                </h4>
                <p>
                  Hover over any bubble to see a tooltip showing the company’s name, ticker, and exact values for the X, Y,
                  and Z metrics. Larger bubbles may display the ticker symbol directly on the chart for quick identification.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-100 mb-1">Analysis</h4>
                <p>
                  Look for patterns, clusters, and outliers. For example:
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                    <li>
                      Do companies with high X-axis values also have high Y-axis values (positive correlation)?
                    </li>
                    <li>Are there distinct groups based on color (status)?</li>
                    <li>Are the largest bubbles clustered in one area, indicating dominant players?</li>
                  </ul>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <TrendingUp size={24} className="text-cyan-400" />
                Example Use Case: Identifying Value Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-xs">
                <strong>Objective:</strong> Find undervalued gold producers with strong production potential.
              </p>
              <div className="space-y-2 text-xs">
                <p>
                  <strong>1. Filter Setup:</strong> Development Status = "Producer", Commodity = "Gold"
                </p>
                <p>
                  <strong>2. X-Axis:</strong> P/E Ratio (lower values indicate better valuation)
                </p>
                <p>
                  <strong>3. Y-Axis:</strong> Gold Production (koz, higher values indicate stronger output)
                </p>
                <p>
                  <strong>4. Z-Axis:</strong> Market Cap (larger bubbles indicate larger companies)
                </p>
                <p>
                  <strong>5. Scale:</strong> Use Log scale for Market Cap to better visualize size differences
                </p>
                <p>
                  <strong>6. Analysis:</strong> Look for companies in the bottom-right quadrant (low P/E, high production)
                  with large bubbles (significant market presence).
                </p>
              </div>
              <div className="mt-4 p-3 bg-accent-teal/10 border border-accent-teal/30 rounded-md">
                <p className="text-xs">
                  <strong className="text-accent-teal">Result:</strong> This configuration highlights gold producers with
                  attractive valuations and strong production, ideal for value-focused investors.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Lightbulb size={24} className="text-cyan-400" />
                Best Practices & Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-md">
                  <p className="font-semibold text-green-400 mb-1">Do: Combine Complementary Metrics</p>
                  <p className="text-xs">
                    Choose metrics that provide different perspectives, like valuation (P/E Ratio), operational (Production),
                    and size (Market Cap), to get a holistic view.
                  </p>
                </div>
                <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-md">
                  <p className="font-semibold text-green-400 mb-1">Do: Use Filters Strategically</p>
                  <p className="text-xs">
                    Narrow your dataset with filters (e.g., specific commodities or development stages) to focus on relevant
                    companies and reduce noise.
                  </p>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-md">
                  <p className="font-semibold text-yellow-400 mb-1">Caution: Scale Sensitivity</p>
                  <p className="text-xs">
                    Log scales can exaggerate small differences in low-value metrics. Verify patterns with Linear scale to
                    confirm trends.
                  </p>
                </div>
                <div className="bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-md">
                  <p className="font-semibold text-yellow-400 mb-1">Caution: Outlier Impact</p>
                  <p className="text-xs">
                    Extreme values (e.g., a single company with massive Market Cap) can skew the chart. Use filters to exclude
                    outliers if needed.
                  </p>
                </div>
                <div className="bg-red-900/20 border border-red-700/30 p-3 rounded-md">
                  <p className="font-semibold text-red-400 mb-1">Avoid: Overloading with Metrics</p>
                  <p className="text-xs">
                    Stick to three metrics (X, Y, Z) to keep the chart interpretable. Comparing too many variables at once can
                    obscure insights.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}