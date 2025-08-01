// src/pages/blog/index.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

// We'll manage our list of blog posts here
const blogPosts = [
  {
    slug: 'how-to-choose-a-precious-metals-mining-company-to-invest-in',
    title: 'How to Choose a Precious Metals Mining Company to Invest In',
    description: 'Our expert guide on selecting the best mining companies for your portfolio, covering key metrics and analysis techniques.',
    date: 'August 1, 2025',
    author: 'The MapleAurum Team',
  },
  // Add future blog posts here
];

export function BlogLandingPage() {
  const backgroundImageUrl = '/Background2.jpg';

  return (
    <PageContainer
      title="MapleAurum Blog"
      description="In-depth analysis, investment guides, and market insights for the precious metals sector."
    >
        <Helmet>
            <title>MapleAurum Blog | Mining Investment Guides & Analysis</title>
            <meta name="description" content="Explore in-depth analysis, investment guides, and market insights for the precious metals sector from the experts at MapleAurum." />
            <link rel="canonical" href="https://mapleaurum.com/blog" />
        </Helmet>
        <div className="relative isolate">
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
                style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
                aria-hidden="true"
            />
            <div className="relative z-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {blogPosts.map((post) => (
                    <Link
                        to={`/blog/${post.slug}`}
                        key={post.slug}
                        className="block hover:no-underline group rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-900 focus:ring-cyan-500"
                    >
                        <Card className="h-full bg-navy-800/70 border border-navy-700 hover:border-cyan-700/50 backdrop-blur-sm transition-all group-hover:scale-[1.02] group-hover:border-cyan-600 group-focus:border-cyan-600">
                            <CardHeader className="pb-3 pt-4">
                                <CardTitle className="text-base font-semibold text-cyan-400 group-hover:text-cyan-300 flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        {post.title}
                                    </span>
                                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-300">{post.description}</p>
                                <p className="text-xs text-gray-500 mt-3">{post.date}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    </PageContainer>
  );
}