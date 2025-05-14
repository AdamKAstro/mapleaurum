// src/pages/help/scoring-guide.tsx
import React from 'react';
import { PageContainer } from '../../components/ui/page-container'; // Adjusted path
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'; // Adjusted path
import { Button } from '../../components/ui/button'; // Adjusted path
import { Calculator, SlidersHorizontal, ListOrdered, Info, ChevronsDown, ChevronsUp, Microscope, Settings, HelpCircle, Package } from 'lucide-react';

export function HelpScoringPage() {
    const backgroundImageUrl = "/Background2.jpg"; // Ensure this path is correct from your public folder

    const FormulaDisplay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="my-2 p-3 bg-navy-900/50 border border-navy-700 rounded-md text-sm">
            <code className="text-cyan-300 whitespace-pre-wrap font-mono">{children}</code>
        </div>
    );

    return (
        <PageContainer
            title="Guide: Company Scoring Engine"
            description="Understand the methodologies behind custom company rankings and advanced scoring features."
        >
            <div className="relative isolate">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
                <div className="relative z-0 space-y-8 text-gray-300 max-w-4xl mx-auto prose prose-sm sm:prose-base prose-invert prose-headings:text-cyan-400 prose-a:text-accent-teal hover:prose-a:text-accent-yellow prose-strong:text-surface-white">
                    
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Calculator size={24} /> Introduction to the Scoring Engine
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p>The Maple Aurum Scoring Engine is a powerful tool designed to provide you with flexible and customizable company rankings. By assigning weights to various financial and operational metrics, you can generate a composite score that reflects what you value most in a mining company.</p>
                            <p>The engine processes companies currently included in your <strong className="text-accent-yellow">active filter set</strong> (defined on the main Companies page or the Advanced Filters page). This allows you to score specific peer groups, such as "All Gold Producers under $500M Market Cap," or the entire database if no filters are active.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <SlidersHorizontal size={24} /> 1. Metric Weights & Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>The "Metric Weights & Settings" card is your primary control panel for defining the scoring model.</p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li><strong>Weight Sliders (0-100%):</strong> For each accessible metric, a slider allows you to assign its importance. A weight of 0 means the metric is ignored. A weight of 100 gives it full consideration relative to other weighted metrics. Metrics are grouped by category (e.g., Financials, Valuation, Production).</li>
                                <li><strong>Tier Accessibility:</strong> Only metrics included in your current subscription tier will be available for weighting. Others will be indicated as locked or not shown.</li>
                                <li><strong>Metric Info:</strong> Hover over the <Info size={14} className="inline align-baseline text-gray-400 mx-0.5"/> icon next to a metric's name for a detailed description of what it represents.</li>
                                <li><strong>Quick Adjustments:</strong> Use the <Button variant="outline" size="xs" className="pointer-events-none mx-0.5 text-xs"><ChevronsUp className="h-3 w-3 mr-0.5"/>Max</Button> and <Button variant="outline" size="xs" className="pointer-events-none mx-0.5 text-xs"><ChevronsDown className="h-3 w-3 mr-0.5"/>Min</Button> buttons to set all accessible metric weights to 100% or 0% respectively.</li>
                            </ul>
                            
                            <div className="mt-6 pt-4 border-t border-navy-700">
                                <h3 className="text-lg font-semibold text-accent-yellow mb-2 flex items-center gap-2"><Settings size={20} /> Advanced Scoring Settings</h3>
                                <p className="mb-3">These settings control how raw metric values are processed before being weighted, significantly impacting the scoring outcome.</p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-semibold text-surface-white">Normalization Mode:</h4>
                                        <p className="text-xs text-gray-400 mb-1">Determines how raw data for each metric is scaled to a common range (typically 0 to 1) before weighting. The choice of mode depends on the data's distribution and your analytical goals.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-surface-white">Imputation (Missing Data) Mode:</h4>
                                        <p className="text-xs text-gray-400 mb-1">Defines how the system handles missing or invalid (e.g., null, Infinity, NaN) data points for a company on a specific metric.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                             <CardTitle className="text-xl flex items-center gap-2">
                                <HelpCircle size={24} /> 2. Understanding Normalization Modes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p>Normalization is crucial because metrics are often on vastly different scales (e.g., Market Cap in billions vs. P/E ratio as a single digit). It brings all metrics to a comparable scale, typically 0 to 1, where 1 represents the "best" possible value and 0 the "worst" for that metric, considering whether higher or lower is better.</p>
                            
                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Global Min-Max</h4>
                                <p>Scales values based on the absolute minimum ($X_{min\_global}$) and maximum ($X_{max\_global}$) observed for that metric across the entire database (from the "Metric Full Ranges").</p>
                                <FormulaDisplay>
                                    If higher is better: $X_{norm} = (X - X_{min\_global}) / (X_{max\_global} - X_{min\_global})$
                                    {'\n'}If lower is better: $X_{norm} = 1 - [(X - X_{min\_global}) / (X_{max\_global} - X_{min\_global})]$
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Stable scores, as normalization range is fixed (until global ranges update). Good for comparing against broadest possible spectrum.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Can be skewed by extreme global outliers. May not reflect nuances if the current filtered dataset occupies a small portion of the global range.</p>
                            </div>

                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Min-Max</h4>
                                <p>Scales values based on the minimum ($X_{min\_dataset}$) and maximum ($X_{max\_dataset}$) within the <strong className="text-accent-yellow">currently filtered set of companies</strong> being scored.</p>
                                 <FormulaDisplay>
                                    If higher is better: $X_{norm} = (X - X_{min\_dataset}) / (X_{max\_dataset} - X_{min\_dataset})$
                                    {'\n'}If lower is better: $X_{norm} = 1 - [(X - X_{min\_dataset}) / (X_{max\_dataset} - X_{min\_dataset})]$
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Adapts to the specific peer group you're analyzing, providing better differentiation within that set. The "best" company in the current set for a metric will score 1, and the "worst" will score 0.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Scores for a company can change significantly if the composition of the filtered dataset changes. Not ideal for comparing scores across different filter sets.</p>
                            </div>

                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Rank Percentile</h4>
                                <p>Ranks all companies within the current dataset for each metric from best to worst. The normalized score is based on this rank's percentile.</p>
                                <FormulaDisplay>
                                    Let $N_{valid}$ be the number of companies with valid data for the metric.
                                    {'\n'}Assign ranks $R$ from 1 (best) to $N_{valid}$ (worst), handling ties appropriately.
                                    {'\n'}If higher raw value is better, higher ranks get higher scores. If lower is better, lower ranks get higher scores.
                                    {'\n'}Normalized Score: $X_{norm} = (\text{Rank} - 1) / (N_{valid} - 1)$ (for ascending ranks where 1 is worst, after adjusting for higher/lower is better)
                                    {'\n'}Essentially, $X_{norm}$ is the proportion of companies that perform worse.
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Highly robust to outliers and non-linear data. Focuses purely on relative ordering.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Loses information about the magnitude of difference between data points. Two companies with very different raw values but adjacent ranks will score similarly.</p>
                            </div>

                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Z-Score (Scaled)</h4>
                                <p>Calculates how many standard deviations ($\sigma_{dataset}$) a company's metric value ($X$) is from the mean ($\mu_{dataset}$) of the current dataset. This Z-score is then typically scaled to a 0-1 range.</p>
                                <FormulaDisplay>
                                    Z-Score: $Z = (X - \mu_{dataset}) / \sigma_{dataset}$
                                    {'\n'}Our System Scaling: Normalized $X_{norm} = (Z + 3) / 6$ (approximately maps a Z-score range of -3 to +3 onto 0 to 1).
                                    {'\n'}Final $X_{norm}$ is then clamped between 0 and 1.
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Highlights how "average" or "exceptional" a company is relative to its peers for a metric. Considers the distribution's spread.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Assumes data is somewhat normally distributed for Z-scores to be most meaningful. Sensitive to dataset changes. The scaling step to 0-1 is an approximation.</p>
                            </div>
                             <p className="mt-4"><strong>Note:</strong> For all modes, if a metric is defined as "lower is better" (e.g., AISC, Debt), the normalized score ($X_{norm}$) is inverted ($1 - X_{norm}$) so that a lower raw value results in a higher (better) normalized score.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                             <CardTitle className="text-xl flex items-center gap-2">
                                <Package size={24} /> 3. Understanding Imputation Modes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Imputation deals with how the system handles missing or invalid data (e.g., null, Infinity, text where a number is expected) for a company on a particular metric before normalization.</p>
                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Treat as Zero/Worst</h4>
                                <p className="text-xs">If a company's value for a metric is unusable, its normalized score for that metric effectively becomes 0 (if higher values are better) or 1 (if lower values are better, which after inversion also becomes 0 contribution to "goodness"). This means it gets the worst possible score for that metric component.</p>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Simple, clearly penalizes missing/invalid data.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Can be overly punitive if data is missing for reasons unrelated to poor performance. Does not use information from other companies.</p>
                            </div>
                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Mean</h4>
                                <p className="text-xs">Replaces unusable values with the arithmetic mean ($\mu_{dataset}$) of all valid, finite values for that metric from the <strong className="text-accent-yellow">currently filtered set of companies</strong>. This imputed mean is then normalized.</p>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Allows the company to still be scored on the metric. Does not drastically alter the overall mean of the dataset for that metric if only a few values are imputed.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> The mean is sensitive to outliers within the dataset, so the imputed value might not be representative if the data is skewed. Reduces the variance of the metric.</p>
                            </div>
                             <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Median</h4>
                                <p className="text-xs">Replaces unusable values with the median (middle value) of all valid, finite values for that metric from the <strong className="text-accent-yellow">currently filtered set of companies</strong>. This imputed median is then normalized.</p>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> More robust to outliers than mean imputation, making it generally safer for skewed financial data. Allows scoring on the metric.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Can distort the distribution if many values are imputed. Reduces variance. May not be as "smooth" as mean imputation if the dataset is small.</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ListOrdered size={24} /> 4. Ranked Companies & Score Aggregation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p>The "Ranked Companies" card displays the list of companies from your active filter set, ordered by their final calculated score (highest first).</p>
                            <h4 className="text-md font-semibold text-accent-teal mt-2">Score Aggregation:</h4>
                            <ol className="list-decimal space-y-1 pl-5 text-sm">
                                <li>For each company and each <strong className="text-accent-yellow">active (weight &gt; 0) and accessible</strong> metric:
                                    <ul className="list-disc pl-5 text-xs">
                                        <li>The raw metric value is retrieved.</li>
                                        <li>If unusable, it's handled by the selected <strong className="text-accent-yellow">Imputation Mode</strong>.</li>
                                        <li>The (potentially imputed) value is then normalized to a 0-1 scale using the selected <strong className="text-accent-yellow">Normalization Mode</strong>, considering if higher or lower raw values are better for that metric. Let this be $X_{norm}$.</li>
                                    </ul>
                                </li>
                                <li>The <strong className="text-accent-yellow">Normalized Value</strong> ($X_{norm}$) for each metric is multiplied by its assigned <strong className="text-accent-yellow">User Weight</strong> ($W_i$). This gives a $WeightedNormalizedScore_i = X_{norm\_i} \times W_i$.</li>
                                <li>All $WeightedNormalizedScore_i$ values for a company are summed: $\sum (X_{norm\_i} \times W_i)$.</li>
                                <li>The sum of all <strong className="text-accent-yellow">User Weights</strong> that were applied (i.e., for metrics that had data and were scored) is calculated: $\sum W_i$.</li>
                                <li>The company's final score is calculated as:
                                    <FormulaDisplay>
                                        Final Score = $(\sum (X_{norm\_i} \times W_i) / \sum W_i) \times 1000$
                                    </FormulaDisplay>
                                    If $\sum W_i$ is zero (no metrics could be scored), the final score will be N/A. The score is typically between 0 and 1000.
                                </li>
                            </ol>
                            <p className="mt-2">An "N/A" score indicates the company could not be scored, usually due to missing data for all heavily weighted metrics or issues during calculation for those metrics.</p>
                            <p>The <strong className="text-accent-yellow">Status Filter</strong> dropdown on this card allows you to visually filter the ranked list by company status (e.g., Producer, Developer) without affecting the underlying scores or global filters.</p>
                        </CardContent>
                    </Card>

                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                <Microscope size={20} /> Understanding Debug Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p>For transparency and troubleshooting, you can view detailed scoring information for each company:</p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li>Click the <Microscope size={14} className="inline align-baseline text-gray-400 mx-1"/> icon next to a company in the ranked list to toggle its debug information.</li>
                                <li><strong>Calculation Summary:</strong> This shows the final aggregated numbers for that company:
                                    <ul className="list-circle pl-5 text-xs">
                                        <li>Total Weighted Score Sum: The sum of (Normalized Score × Weight) across all contributing metrics.</li>
                                        <li>Total Effective Weight: The sum of weights for all metrics that successfully contributed to the score.</li>
                                        <li>Final Calculated Score: The value displayed in the ranked list.</li>
                                    </ul>
                                </li>
                                <li><strong>Active Metric Breakdown:</strong> This section details each metric that was <strong className="text-accent-yellow">accessible to your tier, had a user-assigned weight &gt; 0, and was successfully included in the score calculation</strong>. For each of these metrics, you'll see:
                                    <ul className="list-circle pl-5 text-xs">
                                        <li>Metric Name & User Weight.</li>
                                        <li>Raw Value: The original value from the database.</li>
                                        <li>Processed Value: The value after initial handling (e.g., converting "Infinity" string to JS Infinity).</li>
                                        <li>Imputed Value (if applicable): The value used if the original was unusable, along with the imputation method.</li>
                                        <li>Value for Normalization: The actual numeric value that was fed into the normalization step.</li>
                                        <li>Normalized Value: The score for that metric on a 0-1 scale, with the normalization mode indicated.</li>
                                        <li>Weighted Score: The normalized value multiplied by its weight.</li>
                                        <li>Notes/Errors: Any specific issues encountered for that metric (e.g., "Global range invalid").</li>
                                    </ul>
                                </li>
                                <li>This debug information is crucial for understanding why a company received a particular score or if certain metrics are not contributing as expected due to data issues or settings.</li>
                            </ul>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </PageContainer>
    );
}