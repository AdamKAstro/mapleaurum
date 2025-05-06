//src/pages/success/index.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, Table2 } from 'lucide-react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export function SuccessPage() {
    return (
        <PageContainer
            title="Subscription Confirmed"
            description="Welcome to MapleAurum Premium Analytics"
            className="relative isolate"
        >
            {/* Background */}
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" />

            <div className="max-w-2xl mx-auto mt-8">
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Payment Successful!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Confirmation Message */}
                        <div className="text-center space-y-2">
                            <p className="text-gray-300">
                                Thank you for subscribing to MapleAurum. Your account has been upgraded and you now have access to premium features.
                            </p>
                            <p className="text-sm text-gray-400">
                                A confirmation email will be sent to your registered email address shortly.
                            </p>
                        </div>

                        {/* What's Next Section */}
                        <div className="bg-navy-700/50 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-cyan-400">What's Next?</h3>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="h-4 w-4 mt-1 text-emerald-500 flex-shrink-0" />
                                    <span>Explore advanced metrics and analytics in the Companies Database</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="h-4 w-4 mt-1 text-emerald-500 flex-shrink-0" />
                                    <span>Access detailed production data and cost metrics</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="h-4 w-4 mt-1 text-emerald-500 flex-shrink-0" />
                                    <span>Use the advanced filtering and scoring features</span>
                                </li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Link to="/companies" className="flex-1">
                                <Button className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white">
                                    <Table2 className="h-4 w-4 mr-2" />
                                    View Companies
                                </Button>
                            </Link>
                            <Link to="/" className="flex-1">
                                <Button variant="outline" className="w-full border-navy-600 text-gray-300 hover:bg-navy-700">
                                    <Home className="h-4 w-4 mr-2" />
                                    Return Home
                                </Button>
                            </Link>
                        </div>

                        {/* Support Info */}
                        <div className="text-center text-xs text-gray-400 pt-4">
                            <p>Need help? Contact our support team at <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:text-cyan-300">support@mapleaurum.com</a></p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}