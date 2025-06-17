// src/components/company-name-badge.tsx
import React from 'react';
import { motion } from 'framer-motion';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Building2, MapPin, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { GLASS_EFFECTS } from '../styles/glass-effects';

interface CompanyNameBadgeProps {
  name: string;
  code: string;
  headquarters?: string | null;
  description?: string | null;
  className?: string;
}

export function CompanyNameBadge({ name, code, headquarters, description, className }: CompanyNameBadgeProps) {
  // Use the 'badge' preset and enable rotation
  const badgeClasses = cn(GLASS_EFFECTS.badge, 'max-w-[210px] cursor-help');

  return (
    <Tooltip.Provider delayDuration={100}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            className={cn(badgeClasses, className)}
          >
            {/* The complex glass effect is now applied cleanly via GLASS_EFFECTS.badge */}
            
            {/* Content with improved text styling for contrast */}
            <div className="relative z-10 flex items-center gap-1.5 max-w-full">
              <span className="text-sm font-bold text-surface-white truncate drop-shadow-md">
                {name}
              </span>
              <span className="text-xs font-mono text-accent-yellow/90 whitespace-nowrap">
                {code}
              </span>
            </div>
          </motion.div>
        </Tooltip.Trigger>

        <Tooltip.Portal>
          <Tooltip.Content
            // Apply the glass effect to the tooltip as well!
            className={cn(
              GLASS_EFFECTS.tooltip, 
              'tooltip-content text-surface-white max-w-sm animate-in fade-in-0 zoom-in-95'
            )}
            sideOffset={5}
            collisionPadding={20}
          >
            <div className="space-y-3 relative z-10">
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
            <Tooltip.Arrow className="fill-navy-600/50" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}