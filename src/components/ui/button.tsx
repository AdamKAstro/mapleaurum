// src/components/ui/button.tsx
import React from 'react';
import { cn } from '../../lib/utils';

// Import Tooltip components from your ui library
// Assuming you have these or similar from a Shadcn UI setup or similar
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'; // Adjust path if different

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon-sm'; // Added 'icon-sm' size
  isLoading?: boolean;
  fullWidth?: boolean;
  tooltipContent?: React.ReactNode; // New prop for tooltip content
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'; // New prop for tooltip side
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  disabled,
  tooltipContent, // Destructure new tooltip props
  tooltipSide = 'top', // Default tooltip side
  ...props
}: ButtonProps) {
  const buttonContent = (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
        'backdrop-blur-md border border-solid',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95 hover:scale-[1.02]',
        'before:absolute before:inset-0 before:rounded-xl before:bg-white/5',
        {
          'px-4 py-2 text-sm': size === 'sm',
          'px-6 py-3 text-base': size === 'md',
          'px-8 py-4 text-lg': size === 'lg',
          'h-8 w-8 p-0 flex-shrink-0': size === 'icon-sm', // Custom styles for icon-sm
          'w-full': fullWidth,

          // Primary variant - glassmorphic blue
          'bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-white shadow-xl border-blue-400/30': variant === 'primary',
          'hover:from-blue-500/30 hover:to-blue-600/40 hover:shadow-2xl hover:border-blue-300/40': variant === 'primary' && !disabled,
          'focus:ring-blue-400/50': variant === 'primary',

          // Secondary variant - glassmorphic neutral
          'bg-gradient-to-br from-white/10 to-white/20 text-gray-100 shadow-lg border-white/20': variant === 'secondary',
          'hover:from-white/20 hover:to-white/30 hover:shadow-xl hover:border-white/30': variant === 'secondary' && !disabled,
          'focus:ring-white/30': variant === 'secondary',

          // Outline variant - glassmorphic minimal
          'bg-white/5 text-gray-100 shadow-md border-white/30': variant === 'outline',
          'hover:bg-white/10 hover:border-white/40 hover:shadow-lg': variant === 'outline' && !disabled,
          'focus:ring-white/40': variant === 'outline',

          // Ghost variant - glassmorphic subtle
          'bg-transparent text-gray-200 border-transparent': variant === 'ghost',
          'hover:bg-white/10 hover:border-white/20 hover:text-white': variant === 'ghost' && !disabled,
          'focus:ring-white/20': variant === 'ghost',
        },
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {/* Glass shine effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />

      {/* Loading spinner */}
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : null}

      {/* Button content */}
      <span className={cn('relative z-10', { 'opacity-0': isLoading })}>
        {children}
      </span>
    </button>
  );

  // If tooltipContent is provided, wrap the button in a Tooltip
  if (tooltipContent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side={tooltipSide} className="tooltip-content z-50 bg-navy-600 border-navy-500 text-gray-200 rounded px-2 py-1 text-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}