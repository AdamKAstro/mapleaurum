// src/components/ui/page-container.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Table2, LineChart, Filter, Calculator, Crown, FilterX, HelpCircle } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { useFilters } from '../../contexts/filter-context';

interface PageContainerProps {
    title: string;
    description?: React.ReactNode; // Changed from string to ReactNode to support JSX
    children: React.ReactNode;
    actions?: React.ReactNode;
    className?: string;
    contentClassName?: string;
    showNav?: boolean;
}

// Navigation items definition - Includes HELP
const navItems = [
    { path: "/companies", label: "Companies", icon: Table2 },
    { path: "/scatter-chart", label: "Analysis", icon: LineChart },
    { path: "/filter", label: "Filters", icon: Filter },
    { path: "/scoring", label: "Scoring", icon: Calculator },
    { path: "/subscribe", label: "Subscribe", icon: Crown },
    { path: "/help", label: "Help", icon: HelpCircle },
];

export function PageContainer({
    title,
    description,
    children,
    actions,
    className,
    contentClassName,
    showNav = true
}: PageContainerProps) {
    const { resetFilters } = useFilters();
    const location = useLocation();

    return (
        <div className={cn("container mx-auto px-4 py-4 space-y-4", className)}>

            {/* Top Bar: Title/Description on Left, Nav/Actions on Right */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-navy-700 pb-3 mb-4">
                {/* Left Side: Title and Description */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                        {title}
                    </h1>
                    {description && (
                        // Fixed: Use div instead of p when description contains JSX
                        <div className="text-xs sm:text-sm text-gray-400">
                            {description}
                        </div>
                    )}
                </div>

                {/* Right Side: Nav Icons, Reset Button, Page Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Conditional Navigation Icons */}
                    {showNav && navItems
                        .filter(item => item.path !== location.pathname)
                        .map((item) => (
                            <Link key={item.path} to={item.path} className="hidden sm:block" >
                                <Button variant="ghost" size="icon-sm" className="text-gray-400 hover:text-white hover:bg-navy-700/50" title={item.label} >
                                    <item.icon className="h-4 w-4" />
                                </Button>
                            </Link>
                        ))}

                    {/* Global Reset Button */}
                    {showNav && location.pathname !== '/' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetFilters}
                            className="text-xs border-navy-600 text-gray-300 hover:bg-navy-700 hover:text-white flex items-center gap-1.5"
                            title="Reset all filters & exclusions"
                        >
                            <FilterX className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Reset Filters</span>
                            <span className="md:hidden">Reset</span>
                        </Button>
                    )}

                    {/* Page Specific Actions */}
                    {actions && (
                        <div className="flex items-center gap-2 border-l border-navy-700 pl-2 ml-1">
                            {actions}
                        </div>
                    )}
                </div>
            </div>

            {/* Page Content */}
            <div className={cn(contentClassName)}>
                {children}
            </div>
        </div>
    );
}