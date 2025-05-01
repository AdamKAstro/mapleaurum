import React from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { HelpCircle, Database, Clock, Mail, Calculator } from 'lucide-react';

const faqs = [
    {
        question: "What companies are included in this service/database?",
        answer: "This service and database are exclusively for Canadian listed companies with exposure to precious metals, such as gold, silver, platinum, or palladium. Only companies publicly traded on Canadian exchanges (e.g., TSX, TSX-V) with operations, projects, or investments in precious metals are included.",
        icon: HelpCircle
    },
    {
        question: "Where does the financial and company data come from?",
        answer: "Our data is aggregated from multiple reputable sources, including public company financial statements (such as SEDAR/EDGAR filings), real-time stock exchange feeds, and established financial data providers. We strive to ensure accuracy but recommend cross-referencing critical data with source documents.",
        icon: Database
    },
    {
        question: "How often is the data updated?",
        answer: "Data update frequency varies by type. Stock prices are updated frequently during market hours (usually with a 15-20 minute delay). Core financial data (revenue, earnings, cash, debt etc.) is typically updated quarterly, shortly after companies release their official reports. Resource and reserve estimates are updated as companies publish new technical reports (often annually or coinciding with major project milestones).",
        icon: Clock
    },
    {
        question: "Are all metrics available for all companies?",
        answer: "No. Data availability depends on the company's reporting practices, development stage, and the specific metrics. For example, exploration companies typically won't have production or cost data, and private companies or those listed on minor exchanges may have less comprehensive financial reporting. The platform will display '-' or 'N/A' where data is unavailable.",
        icon: HelpCircle
    },
     {
        question: "How are calculated metrics (like ratios, EV) determined?",
        answer: "Metrics like Price-to-Book (P/B), EV/Resource oz, Enterprise Value (EV), etc., are calculated by our system based on the underlying source data (e.g., market cap, shares outstanding, cash, debt, resource estimates) using standard financial formulas. The exact formulas and methodologies adhere to common industry practices.",
        icon: Calculator
    },
    {
        question: "How do I report a data issue or get help?",
        answer: "If you believe there's an error in the data or need assistance using the platform, please contact our support team at support@mapleaurum.com Please provide the company name, and the issue observed.",
        icon: Mail
    },
];

export function HelpGeneralPage() {
    const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="General Information & FAQ"
            description="Common questions about data sources, updates, and platform usage."
        >
            <div className="relative isolate">
                 <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
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
                             <p className="text-xs text-gray-400">The data and analysis provided on this platform are for informational purposes only and should not be considered financial advice. Always conduct your own thorough research and consult with a qualified financial advisor before making any investment decisions. While we strive for accuracy, data may contain errors or omissions.</p>
                         </CardContent>
                     </Card>

                 </div>
            </div>
        </PageContainer>
    );
}