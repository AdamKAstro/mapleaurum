// src/components/ui/GlassContainer.tsx
import React from 'react';
import { cn } from '../../lib/utils';
import { GLASS_EFFECTS } from '../../styles/glass-effects';

interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: keyof typeof GLASS_EFFECTS;
  rotate?: boolean;
}

export function GlassContainer({
  children,
  className,
  variant = 'card',
  rotate = true, // Default to using the rotation effect
  ...props
}: GlassContainerProps) {
  // Select the base classes from the centralized presets
  const baseClasses = GLASS_EFFECTS[variant] || GLASS_EFFECTS.card;

  // Conditionally remove the rotation class if not desired
  const finalClasses = rotate ? baseClasses : baseClasses.replace('glass-rotate', '').trim();

  return (
    <div className={cn(finalClasses, className)} {...props}>
      {children}
    </div>
  );
}