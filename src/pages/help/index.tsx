//src/pages/help/index.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowRight, HelpCircle, ScatterChart as Scatter } from 'lucide-react'; // Added Scatter

const helpTopics = [
  { path: '/help/metrics', title: 'Metric Explanations', description: 'Understand every data point used in the analysis and scoring.', icon: HelpCircle },
  { path: '/help/filters', title: 'Using Filters', description: 'Learn how to effectively select and filter company data.', icon: HelpCircle },
  { path: '/help/scoring', title: 'Using Scoring', description: 'Discover how to rank companies based on custom metric weights.', icon: HelpCircle },
  { path: '/help/scatter-chart', title: 'Using Scatter Chart', description: 'Visualize relationships between different company metrics.', icon: HelpCircle },
  { path: '/help/scatter-score-pro', title: 'Using ScatterScore Pro', description: 'Master advanced multi-dimensional company scoring.', icon: Scatter }, // New Topic
  { path: '/help/tiers', title: 'Subscription Tiers', description: 'Compare plan features and access levels.', icon: HelpCircle },
  { path: '/help/general', title: 'General & FAQ', description: 'Find answers to common questions about data and usage.', icon: HelpCircle },
];

export function HelpLandingPage() {
  const backgroundImageUrl = '/Background2.jpg'; // Path to your background image in /public

  return (
    <PageContainer
      title="Help Center"
      description="Find answers and guides for using the Maple Aurum platform."
    >
      <div className="relative isolate">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
          style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
          aria-hidden="true"
        />
        <div className="relative z-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {helpTopics.map((topic) => (
            <Link
              to={topic.path}
              key={topic.path}
              className="block hover:no-underline group rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 focus:ring-cyan-500"
            >
              <Card className="h-full bg-navy-800/70 border border-navy-700 hover:border-cyan-700/50 backdrop-blur-sm transition-all group-hover:scale-[1.02] group-hover:border-cyan-600 group-focus:border-cyan-600">
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base font-semibold text-cyan-400 group-hover:text-cyan-300 flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      <topic.icon className="h-4 w-4" />
                      {topic.title}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">{topic.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}