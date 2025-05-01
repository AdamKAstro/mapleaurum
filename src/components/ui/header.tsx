//src/components/ui/header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useFilters } from '../../contexts/filter-context';
import { CurrencySelector } from '../../components/currency-selector';

export function Header() {
    const { currentUserTier } = useFilters();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-navy-300/20 bg-navy-500/95 backdrop-blur supports-[backdrop-filter]:bg-navy-500/60">
            <div className="container flex h-14 items-center justify-between mx-auto px-4">
                {/* Brand / Logo */}
                <div className="mr-4 flex">
                    <Link className="mr-6 flex items-center gap-2" to="/">
                        <img
                            src="/new-logo.png"
                            alt="Maple Aurum Logo"
                            className="h-8 w-8 object-contain"
                        />
                        <span className="font-bold text-surface-white hidden sm:inline-block">
                            Maple Aurum
                        </span>
                    </Link>
                </div>

                {/* Right Side Items */}
                <div className="flex items-center gap-2 md:gap-4">
                    <CurrencySelector />
                </div>
            </div>
        </header>
    );
}