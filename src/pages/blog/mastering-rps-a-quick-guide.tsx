// src/pages/blog/mastering-rps-a-quick-guide.tsx

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { BarChart3, Users, Scale, Factory, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MasteringRPSBlogPage() {
    return (
        <PageContainer
            title="Mastering the Relative Performance Score: A Quick Guide"
            description="Watch our video guide to understand how the RPS tool provides a dynamic, multi-faceted scoring system for analyzing mining companies relative to their true peers."
        >
            <Helmet>
                <title>MapleAurum | Mastering the RPS: A Quick Guide</title>
                <meta name="description" content="A video guide and article explaining the powerful Relative Performance Score (RPS) tool for contextual, peer-based analysis of precious metals companies." />
                <link rel="canonical" href="https://mapleaurum.com/blog/mastering-rps-a-quick-guide" />
            </Helmet>
            
            <div className={cn(
                'relative z-0 space-y-8 text-gray-300 max-w-4xl mx-auto prose prose-sm sm:prose-base prose-invert',
                'prose-headings:text-cyan-400 prose-headings:font-semibold prose-a:text-accent-teal hover:prose-a:text-accent-yellow prose-strong:text-surface-white'
            )}>

                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <Video size={24} className="text-cyan-400" />
                            Video Guide: Mastering RPS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Descript Embed Code */}
                        <div style={{ position: 'relative', paddingBottom: '62.5%', height: 0 }}>
                            <iframe
                                src="https://share.descript.com/embed/hX7CdjTAD1I"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                title="Mastering the Relative Performance Score Video"
                            ></iframe>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <BarChart3 size={24} className="text-cyan-400" />
                            Why Relative Scoring is an Analytical Edge
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>
                            In the complex world of mining investment, context is crucial. A simple, one-size-fits-all score can be misleading. The **Relative Performance Score (RPS)** tool is designed to overcome this by providing a dynamic, multi-faceted analysis that compares companies not against the entire market, but against their most relevant competitors.
                        </p>
                        <p>
                            As the video guide demonstrates, the power of RPS lies in its three-lens approach to peer analysis:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                            <div className="border border-teal-700/50 bg-teal-900/10 rounded-lg p-4 text-center flex flex-col items-center">
                                <Users size={24} className="text-teal-400 mb-2" />
                                <h4 className="font-semibold text-teal-400">Status Peers</h4>
                                <p className="text-xs mt-2">Provides a high-level ranking against all companies of the same type (e.g., Producer, Explorer).</p>
                            </div>
                            <div className="border border-sky-700/50 bg-sky-900/10 rounded-lg p-4 text-center flex flex-col items-center">
                                <Scale size={24} className="text-sky-400 mb-2" />
                                <h4 className="font-semibold text-sky-400">Valuation Peers</h4>
                                <p className="text-xs mt-2">Focuses on financial competitors by comparing against the 10 most similarly-sized companies.</p>
                            </div>
                            <div className="border border-indigo-700/50 bg-indigo-900/10 rounded-lg p-4 text-center flex flex-col items-center">
                                <Factory size={24} className="text-indigo-400 mb-2" />
                                <h4 className="font-semibold text-indigo-400">Operational Peers</h4>
                                <p className="text-xs mt-2">Offers an "apples-to-apples" comparison against companies with a similar operational footprint.</p>
                            </div>
                        </div>
                        <p>
                            By allowing you to weight these peer groups and the underlying metrics, the RPS tool transforms from a static data display into a dynamic analytical sandbox. It empowers you to test your investment thesis, uncover hidden value, and make decisions with greater, data-driven conviction.
                        </p>
                    </CardContent>
                </Card>

            </div>
        </PageContainer>
    );
}