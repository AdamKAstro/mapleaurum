🗺️ COMPLETE ARCHITECTURE MAP - How It All Works
Data Flow Overview
User Interaction → Main Component → Hooks → Score Calculation → Chart Display
        ↓                ↓              ↓            ↓               ↓
   Templates      Configuration    Business     Scoring         Visualization
                     Panel          Logic       Engine
1. ENTRY POINT: index.tsx

Purpose: Main orchestrator component
Key Functions:

ScatterScoreProPage() - Main component
handleApplyConfigurationAndCalculateScores() - Triggers score calculation
handleTemplateChange() - Switches templates
handleAxisMetricChange() - Adds/removes/updates metrics


State Management:

Chart data, plot points, error states
Panel open/close state



2. TEMPLATES SYSTEM

templates/*.ts - Investment strategy definitions
templates/index.ts - Registry & helpers
Purpose: Pre-configured investment strategies
Key Functions:

getTemplateByName() - Retrieves template
searchTemplates() - Find templates by keyword
getTemplatesByCategory() - Group templates



3. HOOKS (Business Logic)
useTemplateLoader.ts

Purpose: Manages template loading & state
Key Functions:

loadTemplate() - Loads & applies template configuration
filterAndMapMetrics() - Filters metrics by user tier
updateMetrics() - Manual metric updates


Auto-loads on mount for initial display

useScoreCalculation.ts

Purpose: Calculates scores for each company
Key Functions:

calculateScores() - Main scoring engine
Calls calculateAxisSpecificScore() from scoringUtils
Manages dataset statistics cache



useScatterScoreChart.ts

Purpose: Prepares chart data & options
Key Functions:

Builds chart datasets by company status
Normalizes bubble sizes (Z-axis)
Configures chart options, tooltips, zoom



4. COMPONENTS (UI Layer)
ConfigurationPanel.tsx

Purpose: Main settings panel
Contains template selector, metric configurators, settings

AxisMetricConfigurator.tsx

Purpose: Manages metrics for X/Y axes
Add/remove metrics, adjust weights, toggle higher-is-better

ScaleToggle.tsx

Purpose: Simple linear/log scale toggle

5. UTILITIES
normalizeWeights.ts

Purpose: Ensures metric weights sum to 100%
Smart redistribution when adding/removing metrics

6. TYPES & CONSTANTS

types.ts - All TypeScript interfaces
constants.ts - Colors, settings, debug flags

🔄 COMPLETE FLOW EXAMPLE

Page Load:
index.tsx mounts
→ useTemplateLoader loads default template (Value Hunter)
→ onTemplateApplied callback triggers
→ handleApplyConfigurationAndCalculateScores() runs
→ Chart displays automatically

User Changes Template:
User selects "Growth Catalyst"
→ handleTemplateChange() 
→ loadTemplate() in hook
→ Updates all metrics & settings
→ Auto-triggers score calculation
→ Chart updates

User Adds Metric:
User clicks "Add metric" → selects from dropdown
→ handleAxisMetricChange('X', 'financials.revenue', 'add')
→ normalizeWeights() redistributes weights
→ Updates state
→ User clicks "Apply"
→ Recalculates scores
→ Updates chart