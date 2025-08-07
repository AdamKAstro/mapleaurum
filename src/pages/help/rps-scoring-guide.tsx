// src/pages/help/rps-scoring-guide.tsx

import React from 'react';
import { PageContainer } from '@/components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Scales, Factory } from 'lucide-react';

export function HelpRPSScoringPage() {
    return (
        <PageContainer
            title="RPS Scoring Guide"
            description="Understand the methodology behind the Relative Performance Score (RPS) system."
        >
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="text-accent-teal" />
                            Understanding the Relative Performance Score (RPS)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-gray-300">
                        <p>
                            The **Relative Performance Score (RPS)** is a dynamic system designed to evaluate a company not in a vacuum, but directly against its most relevant peers. Instead of a single, absolute score, the RPS provides a multi-faceted view by comparing a company across three distinct peer groups.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-navy-800/50 rounded-lg">
                                <h3 className="font-semibold text-surface-white flex items-center gap-2"><Users size={16}/> Status Peers</h3>
                                <p className="text-sm mt-1">How does it rank against all companies of the same status (e.g., all Producers)?</p>
                            </div>
                            <div className="p-4 bg-navy-800/50 rounded-lg">
                                <h3 className="font-semibold text-surface-white flex items-center gap-2"><Scales size={16}/> Valuation Peers</h3>
                                <p className="text-sm mt-1">How does it measure up against the 10 most similarly-sized companies by Market Cap & EV?</p>
                            </div>
                            <div className="p-4 bg-navy-800/50 rounded-lg">
                                <h3 className="font-semibold text-surface-white flex items-center gap-2"><Factory size={16}/> Operational Peers</h3>
                                <p className="text-sm mt-1">How does it perform against companies with a similar operational scale (e.g., Junior vs. Junior)?</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>The Methodology</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-gray-300">
                        <p>
                            The RPS is calculated by scoring a company on a weighted "basket" of metrics tailored to its status. Each metric is normalized to a 0-100 score based on its percentile rank within a peer group, ensuring fair comparison. You can view and adjust these weights in the RPS Configuration panel.
                        </p>
                        <p>
                            For a full mathematical breakdown, please refer to the "RPS Help" button on the main RPS Scoring page.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}