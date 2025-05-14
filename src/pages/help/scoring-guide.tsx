// src/pages/help/scoring-guide.tsx
import React from 'react';
// Assuming paths based on your project structure
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calculator, SlidersHorizontal, ListOrdered, Info, ChevronsDown, ChevronsUp, Microscope, Settings, HelpCircle, Package } from 'lucide-react';
import { cn } from '../../lib/utils'; // Import cn if not already

export function HelpScoringPage() {
    const backgroundImageUrl = "/Background2.jpg"; // Ensure this path is correct from your public folder

    // Component to nicely display formulas
    const FormulaDisplay: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
        <div className={cn("my-3 p-3 bg-navy-900/60 border border-navy-700 rounded-md text-sm shadow-inner", className)}>
            {/* Using a pre tag for better formatting of multi-line formulas if needed, and ensuring consistent font */}
            <pre className="text-cyan-300 whitespace-pre-wrap font-mono text-[0.8rem] sm:text-xs md:text-sm leading-relaxed m-0 p-0 bg-transparent">{children}</pre>
        </div>
    );

    return (
        <PageContainer
            title="Guide: Company Scoring Engine"
            description="Understand the methodologies behind custom company rankings and advanced scoring features."
        >
            <div className="relative isolate">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
                <div className="relative z-0 space-y-8 text-gray-300 max-w-4xl mx-auto prose prose-sm sm:prose-base prose-invert prose-headings:text-cyan-400 prose-headings:font-semibold prose-a:text-accent-teal hover:prose-a:text-accent-yellow prose-strong:text-surface-white prose-code:text-accent-pink prose-code:before:content-none prose-code:after:content-none prose-code:bg-navy-700/50 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-xs">
                    
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                                <Calculator size={24} className="text-cyan-400"/> Introduction to the Scoring Engine
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 leading-relaxed">
                            <p>The Maple Aurum Scoring Engine is a powerful tool designed to provide you with flexible and customizable company rankings. By assigning weights to various financial and operational metrics, you can generate a composite score that reflects what you value most in a mining company.</p>
                            <p>The engine processes companies currently included in your <strong className="text-accent-yellow">active filter set</strong> (defined on the main Companies page or the Advanced Filters page). This allows you to score specific peer groups, such as "All Gold Producers under $500M Market Cap," or the entire database if no filters are active.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                                <SlidersHorizontal size={24} className="text-cyan-400" /> 1. Metric Weights & Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 leading-relaxed">
                            <p>The "Metric Weights & Settings" card is your primary control panel for defining the scoring model.</p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li><strong>Weight Sliders (0-100%):</strong> For each accessible metric, a slider allows you to assign its importance. A weight of 0% means the metric is ignored. A weight of 100% gives it full consideration relative to other weighted metrics. Metrics are grouped by category (e.g., Financials, Valuation, Production).</li>
                                <li><strong>Tier Accessibility:</strong> Only metrics included in your current subscription tier will be available for weighting. Others will be indicated as locked or not shown.</li>
                                <li><strong>Metric Info:</strong> Hover over the <Info size={14} className="inline align-baseline text-gray-400 mx-0.5"/> icon next to a metric's name for a detailed description of what it represents.</li>
                                <li><strong>Quick Adjustments:</strong> Use the <Button variant="outline" size="sm" className="pointer-events-none mx-0.5 text-xs px-2 py-1 h-auto"><ChevronsUp className="h-3.5 w-3.5 mr-1"/>Max</Button> and <Button variant="outline" size="sm" className="pointer-events-none mx-0.5 text-xs px-2 py-1 h-auto"><ChevronsDown className="h-3.5 w-3.5 mr-1"/>Min</Button> buttons (using "sm" size for better appearance) at the top of the card to quickly set all accessible sliders to 100% or 0%, respectively.</li>
                            </ul>
                            
                            <div className="mt-6 pt-4 border-t border-navy-700/50">
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

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                             <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                                <HelpCircle size={24} className="text-cyan-400" /> 2. Understanding Normalization Modes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 leading-relaxed">
                            <p>Normalization is crucial because metrics are often on vastly different scales (e.g., Market Cap in billions vs. P/E ratio as a single digit). It brings all metrics to a comparable scale, typically 0 to 1, where 1 represents the "best" possible value and 0 the "worst" for that metric, considering whether higher or lower raw values are better.</p>
                            
                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Global Min-Max</h4>
                                <p>Scales values based on the absolute minimum ({'$X_{min\\_global}$'}) and maximum ({'$X_{max\\_global}$'}) observed for that metric across the entire database (from the "Metric Full Ranges").</p>
                                <FormulaDisplay>
                                    If higher is better: {'$X_{norm} = (X - X_{min\\_global}) / (X_{max\\_global} - X_{min\\_global})$'}
                                    {'\n'}If lower is better: {'$X_{norm} = 1 - [(X - X_{min\\_global}) / (X_{max\\_global} - X_{min\\_global})]$'}
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Stable scores, as normalization range is fixed (until global ranges update). Good for comparing against broadest possible spectrum.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Can be skewed by extreme global outliers. May not reflect nuances if the current filtered dataset occupies a small portion of the global range.</p>
                            </div>

                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Min-Max</h4>
                                <p>Scales values based on the minimum ({'$X_{min\\_dataset}$'}) and maximum ({'$X_{max\\_dataset}$'}) within the <strong className="text-accent-yellow">currently filtered set of companies</strong> being scored.</p>
                                 <FormulaDisplay>
                                    If higher is better: {'$X_{norm} = (X - X_{min\\_dataset}) / (X_{max\\_dataset} - X_{min\\_dataset})$'}
                                    {'\n'}If lower is better: {'$X_{norm} = 1 - [(X - X_{min\\_dataset}) / (X_{max\\_dataset} - X_{min\\_dataset})]$'}
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Adapts to the specific peer group you're analyzing, providing better differentiation within that set. The "best" company in the current set for a metric will score 1, and the "worst" will score 0.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Scores for a company can change significantly if the composition of the filtered dataset changes. Not ideal for comparing scores across different filter sets.</p>
                            </div>

                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Rank Percentile</h4>
                                <p>Ranks all companies within the current dataset for each metric from best to worst. The normalized score is based on this rank's percentile.</p>
                                <FormulaDisplay>
                                    Let {'$N_{valid}$'} be the number of companies with valid data for the metric.
                                    {'\n'}Assign ranks {'$R$'} from 1 (best) to {'$N_{valid}$'} (worst), handling ties appropriately.
                                    {'\n'}If higher raw value is better, higher ranks get higher scores. If lower is better, lower ranks get higher scores.
                                    {'\n'}Normalized Score: {'$X_{norm} = (Rank_{adjusted\\_for\\_direction} - 1) / (N_{valid} - 1)$'} (for {'$N_{valid} > 1$'})
                                    {'\n'}If {'$N_{valid} = 1$'}, {'$X_{norm} = 0.5$'}
                                    {'\n'}This means {'$X_{norm}$'} is the proportion of companies that perform worse (or equally, depending on tie-breaking).
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Highly robust to outliers and non-linear data. Focuses purely on relative ordering.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Loses information about the magnitude of difference between data points. Two companies with very different raw values but adjacent ranks will score similarly.</p>
                            </div>

                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Z-Score (Scaled)</h4>
                                <p>Calculates how many standard deviations ({'$\sigma_{dataset}$'}) a company's metric value ({'$X$'}) is from the mean ({'$\mu_{dataset}$'}) of the current dataset. This Z-score is then typically scaled to a 0-1 range.</p>
                                <FormulaDisplay>
                                    Z-Score: {'$Z = (X - \mu_{dataset}) / \sigma_{dataset}$'} (if {'$\sigma_{dataset} > 0$'})
                                    {'\n'}Our System Scaling: Approx. {'$X_{norm} = (Z_{clipped} + 3) / 6$'} (where {'$Z_{clipped}$'} is typically Z clamped to e.g. [-3, 3])
                                    {'\n'}Final {'$X_{norm}$'} is then clamped again between 0 and 1. If {'$\sigma_{dataset} = 0$'}, {'$X_{norm} = 0.5$'}
                                </FormulaDisplay>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Highlights how "average" or "exceptional" a company is relative to its peers for a metric. Considers the distribution's spread.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Assumes data is somewhat normally distributed for Z-scores to be most meaningful. Sensitive to dataset changes. The scaling to 0-1 is an approximation that can compress information from extreme Z-scores.</p>
                            </div>
                             <p className="mt-4"><strong>Important Note on Direction:</strong> For all normalization modes, if a metric is configured as "lower is better" (e.g., AISC, Debt), the calculated normalized score ({'$X_{norm}$'}) is subsequently inverted ({'$1 - X_{norm}$'}). This ensures that for such metrics, a lower (more favorable) raw value consistently results in a higher (better) normalized score contributing positively to the overall company score.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                             <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                                <Package size={24} className="text-cyan-400" /> 3. Understanding Imputation Modes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 leading-relaxed">
                            <p>Imputation addresses how the system handles missing or invalid data (e.g., `null`, `Infinity`, non-numeric text) for a company on a particular metric before normalization. Without imputation, a company missing a critical weighted metric might receive an N/A score or be unfairly penalized.</p>
                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Treat as Zero/Worst (Default)</h4>
                                <p className="text-xs">If a company's value for a metric is unusable, its normalized score for that metric component effectively becomes 0 (if higher raw values are better) or 1 (if lower raw values are better, which after the standard inversion for "lower is better" metrics, also results in a 0 towards the "goodness" scale). This means it gets the worst possible normalized score for that metric's contribution.</p>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Simple to understand and implement. Clearly penalizes missing or invalid data.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Can be overly punitive, especially if data is missing for reasons unrelated to poor performance. It does not leverage any information from the dataset to make an informed guess.</p>
                            </div>
                            <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Mean</h4>
                                <p className="text-xs">Replaces unusable values with the arithmetic mean ({'$\mu_{dataset}$'}) of all valid, finite values for that specific metric, calculated from the <strong className="text-accent-yellow">currently filtered set of companies</strong>. This imputed mean is then passed to the normalization step.</p>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> Allows the company to still be scored on the metric using a central tendency value from its peers. Preserves the dataset mean for that metric if only a few values are imputed.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> The mean is sensitive to outliers within the dataset; if the data for a metric is skewed, the mean might not be a typical or representative value. Imputation reduces the true variance of the metric and can artificially strengthen correlations.</p>
                            </div>
                             <div>
                                <h4 className="text-md font-semibold text-accent-teal">Dataset Median</h4>
                                <p className="text-xs">Replaces unusable values with the median (the 50th percentile, or middle value) of all valid, finite values for that metric, calculated from the <strong className="text-accent-yellow">currently filtered set of companies</strong>. This imputed median is then normalized.</p>
                                <p className="text-xs"><strong className="text-gray-200">Pros:</strong> More robust to outliers than mean imputation, making it generally a safer choice for financial data which often contains skewed distributions. Allows the company to be scored on the metric.</p>
                                <p className="text-xs"><strong className="text-gray-200">Cons:</strong> Like mean imputation, it reduces true variance. If a large proportion of data is missing, imputing with the median can significantly distort the metric's distribution (e.g., creating a large spike at the median value).</p>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                                <ListOrdered size={24} className="text-cyan-400" /> 4. Ranked Companies & Score Aggregation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 leading-relaxed">
                            <p>The "Ranked Companies" card displays the list of companies from your active filter set, ordered by their final calculated score (highest first).</p>
                            <h4 className="text-md font-semibold text-accent-teal mt-2">Score Aggregation Process:</h4>
                            <ol className="list-decimal space-y-2 pl-5 text-sm">
                                <li><strong>Metric Value Processing:</strong> For each company and each metric that is <strong className="text-accent-yellow">accessible by your tier and has a user-assigned weight greater than 0</strong>:
                                    <ul className="list-disc pl-5 text-xs mt-1 space-y-1">
                                        <li>The raw metric value is retrieved from the database.</li>
                                        <li>Invalid or missing values are handled according to the selected <strong className="text-accent-yellow">Imputation Mode</strong> to derive a usable numeric value.</li>
                                        {/* Corrected line 179 */}
                                        <li>This (potentially imputed) numeric value is then normalized to a 0-1 scale using the selected <strong className="text-accent-yellow">Normalization Mode</strong>. This step also accounts for whether higher or lower raw values are considered "better" for that specific metric (e.g., a low AISC is good, so it gets a high normalized score). Let this be the {'$X_{norm\\_i}$'} for metric {'$i$'}.</li>
                                    </ul>
                                </li>
                                <li>The <strong className="text-accent-yellow">Normalized Value</strong> ({'$X_{norm\\_i}$'}) for each processed metric is multiplied by its assigned <strong className="text-accent-yellow">User Weight</strong> ({'$W_i$'} - which is a percentage from 0 to 100, used as a raw number in calculation e.g., 50 for 50%). This gives a {'$WeightedNormalizedScore_i = X_{norm\\_i} \\times W_i$'} .</li>
                                <li>All individual {'$WeightedNormalizedScore_i$'} values for a company are summed up: {'$\sum (X_{norm\\_i} \\times W_i)$'}.</li>
                                <li>The sum of all <strong className="text-accent-yellow">User Weights</strong> ({'$W_i$'}) that were actually applied (i.e., for metrics that had data and were scored) is calculated: {'$\sum W_i$'}.</li>
                                <li>The company's final score is calculated as:
                                    <FormulaDisplay>
                                        Final Score = ({'$\sum (X_{norm\\_i} \\times W_i) / \sum W_i$'}) {'$\times 1000$'}
                                    </FormulaDisplay>
                                    If {'$\sum W_i$'} is zero (e.g., no metrics were weighted, or all weighted metrics had unusable data and 'zero_worst' imputation was not effective in providing a scorable value), the final score will be N/A. The score is designed to generally fall between 0 and 1000.
                                </li>
                            </ol>
                            <p className="mt-3">An "N/A" score indicates the company could not be definitively scored, usually due to insufficient data for the metrics that were assigned significant weight, or if all weighted metrics resulted in non-finite values even after imputation.</p>
                            <p>The <strong className="text-accent-yellow">Status Filter</strong> dropdown on this card allows you to visually filter the ranked list by company status (e.g., Producer, Developer) without affecting the underlying scores or global filters applied on other pages.</p>
                        </CardContent>
                    </Card>

                     <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                                <Microscope size={20} /> 5. Understanding Debug Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm leading-relaxed">
                            <p>For transparency and troubleshooting, you can view detailed scoring information for each company in the ranked list:</p>
                            <ul className="list-disc space-y-2 pl-5">
                                <li>Click the <Microscope size={14} className="inline align-baseline text-gray-400 mx-1"/> icon next to a company to toggle its detailed debug information view directly below it.</li>
                                <li><strong>Calculation Summary:</strong> This concise summary shows:
                                    <ul className="list-circle pl-5 text-xs mt-1 space-y-0.5">
                                        <li>Total Weighted Score Sum: The sum of (Normalized Score × Weight) across all metrics that contributed to the score.</li>
                                        <li>Total Effective Weight: The sum of weights for all metrics that successfully contributed.</li>
                                        <li>Final Calculated Score: The score value displayed in the ranked list.</li>
                                    </ul>
                                </li>
                                <li><strong>Active Metric Breakdown:</strong> This section details each metric that was <strong className="text-accent-yellow">accessible to your tier, had a user-assigned weight &gt; 0, and was successfully included in the score calculation</strong>. For each of these contributing metrics, you'll see:
                                    <ul className="list-circle pl-5 text-xs mt-1 space-y-0.5">
                                        <li>Metric Name & its assigned User Weight (%).</li>
                                        <li>Raw Value: The original value as fetched from the database for that company.</li>
                                        <li>Processed Value: The value after initial handling (e.g., converting "Infinity" string to JavaScript's `Infinity` object, or `null` if unparseable).</li>
                                        <li>Imputed Value (if applicable): If the processed value was unusable, this shows the value used after applying the selected Imputation Mode, along with which mode was used.</li>
                                        <li>Value for Normalization: The actual numeric value that was fed into the normalization algorithm.</li>
                                        <li>Normalized Value: The score for that specific metric, scaled to the 0-1 range, with the Normalization Mode indicated.</li>
                                        <li>Weighted Score: The (Normalized Value × User Weight) for that metric.</li>
                                        <li>Notes/Errors: Any specific issues or informational notes encountered during the processing of this metric for this company (e.g., "Global range invalid," "Imputed with dataset mean").</li>
                                    </ul>
                                </li>
                                <li>This debug information is crucial for understanding exactly how a company's score was derived, why certain metrics might not have contributed as expected (e.g., due to data issues or tier limitations), and for fine-tuning your weighting and scoring settings.</li>
                            </ul>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </PageContainer>
    );
}