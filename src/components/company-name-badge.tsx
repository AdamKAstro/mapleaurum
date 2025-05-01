//src/components/company-name-badge.tsx
import React from 'react';
import { motion } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Building2, MapPin, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface CompanyNameBadgeProps {
  name: string;
  code: string;
  headquarters?: string | null;
  description?: string | null;
  className?: string;
}

export function CompanyNameBadge({ name, code, headquarters, description, className }: CompanyNameBadgeProps) {
  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            className={cn(
              'group relative inline-flex items-center px-2 py-1 rounded-lg',
              'bg-gradient-to-r from-navy-400/50 to-navy-300/50',
              'shadow-sm transition-all duration-300',
              'ring-1 ring-navy-300/20',
              'cursor-help',
              'max-w-[210px]', // Match new column width
              className
            )}
          >
            {/* Subtle glow effect */}
            <div className={cn(
              'absolute inset-0 rounded-lg blur opacity-30 transition-opacity duration-300',
              'bg-gradient-to-r from-accent-teal/20 to-accent-pink/20',
              'group-hover:opacity-50'
            )} />
            
            {/* Content */}
            <div className="relative z-10 flex items-center gap-1 max-w-full">
              <span className="text-xs font-medium text-surface-white truncate">
                {name}
              </span>
              <span className="text-xs font-mono text-accent-yellow/80 whitespace-nowrap">
                {code}
              </span>
            </div>

            {/* Hover border effect */}
            <div className="absolute inset-0 rounded-lg ring-1 ring-surface-white/10 group-hover:ring-surface-white/20 transition-all duration-300" />
          </motion.div>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            className="tooltip-content bg-navy-400 p-4 rounded-lg shadow-lg border border-navy-300/20 text-surface-white max-w-sm animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
            collisionPadding={20}
          >
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-accent-teal mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold">{name}</h3>
                  <div className="text-accent-yellow/80 font-mono text-sm mt-1">{code}</div>
                  {headquarters && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-surface-white/70">
                      <MapPin className="h-3 w-3" />
                      <span>{headquarters}</span>
                    </div>
                  )}
                </div>
              </div>

              {description && (
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-accent-pink mt-1 flex-shrink-0" />
                  <p className="text-sm text-surface-white/70">{description}</p>
                </div>
              )}
            </div>
            <Tooltip.Arrow className="fill-navy-400" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}