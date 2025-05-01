//src/pages/help/general.tsx
import React from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { HelpCircle, Database, Clock, Mail, Calculator } from 'lucide-react';
import { Helmet } from 'react-helmet'; // Add this import

const faqs = [
    {
        question: "What companies are included in MapleAurum’s financial data for Canadian precious metals?",
        answer: "MapleAurum’s database exclusively covers Canadian publicly traded companies listed on exchanges like TSX or TSX-V with exposure to precious metals, such as gold, silver, platinum, or palladium. These include mining companies, exploration firms, and those with investments in precious metals projects across Canada and globally.",
        icon: HelpCircle
    },
    {
        question: "Where does MapleAurum source its financial and company data for Canadian precious metals?",
        answer: "Our financial data is sourced from reputable providers, including SEDAR/EDGAR filings, real-time Canadian stock exchange feeds, and trusted financial data platforms. MapleAurum ensures accuracy for gold investing and mining analytics, but we recommend verifying critical data with primary sources.",
        icon: Database
    },
    {
        question: "How frequently is MapleAurum’s precious metals data updated?",
        answer: "Stock prices for Canadian precious metals companies are updated frequently during market hours (15-20 minute delay). Financial metrics (revenue, earnings, cash, debt) are updated quarterly after official reports. Resource and reserve estimates are refreshed with new technical reports, typically annually or during major project updates.",
        icon: Clock
    },
    {
        question: "Are all financial metrics available for every Canadian precious metals company?",
        answer: "Data availability varies by company stage and reporting. Exploration-stage firms may lack production or cost data, while smaller companies might have limited financial disclosures. MapleAurum displays 'N/A' for unavailable metrics, ensuring clarity for gold investing analysis.",
        icon: HelpCircle
    },
    {
        question: "How does MapleAurum calculate financial ratios and enterprise value for precious metals companies?",
        answer: "MapleAurum uses standard industry formulas to calculate metrics like Price-to-Book (P/B), EV/Resource oz, and Enterprise Value (EV) based on market cap, shares outstanding, cash, debt, and resource estimates. These analytics support informed gold investing decisions in Canada.",
        icon: Calculator
    },
    {
        question: "How can I report a data issue or get support for MapleAurum?",
        answer: "For data issues or platform assistance, contact our support team at support@mapleaurum.com. Please include the company name and details of the issue to help us improve our financial data services for Canadian precious metals.",
        icon: Mail
    },
];

export function HelpGeneralPage() {
    const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="General Information & FAQ - MapleAurum"
            description="Learn about MapleAurum’s financial data for Canadian precious metals companies, data sources, updates, and how to get support."
        >
            <Helmet>
                <title>FAQ - Financial Data for Canadian Precious Metals | MapleAurum</title>
                <meta
                    name="description"
                    content="Answers to common questions about MapleAurum’s financial data services for Canadian precious metals companies, including gold, silver, and more."
                />
                <meta
                    name="keywords"
                    content="Canadian precious metals, gold investing Canada, financial data mining, MapleAurum FAQ, precious metals analytics"
                />
            </Helmet>
            <div className="relative isolate">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
                    style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
                    aria-hidden="true"
                />
                <div className="relative z-0 space-y-6 text-gray-300 max-w-3xl mx-auto">
                    {faqs.map((faq, index) => {
                        const Icon = faq.icon;
                        return (
                            <Card key={index} className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                        <Icon size={18} className="text-cyan-500" />
                                        {faq.question}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-300">{faq.answer}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                    <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold text-cyan-400 flex items-center gap-2">
                                Disclaimer
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-gray-400">
                                MapleAurum’s financial data and analytics for Canadian precious metals companies are for informational purposes only and do not constitute financial advice. Conduct thorough research and consult a qualified financial advisor before investing. Data may contain errors or omissions.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}