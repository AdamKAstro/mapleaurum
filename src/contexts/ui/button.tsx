//src/components/ui/button.tsx
import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95 hover:scale-[1.02]',
        {
          'px-4 py-2 text-sm': size === 'sm',
          'px-6 py-3 text-base': size === 'md',
          'px-8 py-4 text-lg': size === 'lg',
          'w-full': fullWidth,
          
          // Primary variant
          'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-xl hover:shadow-blue-2xl': variant === 'primary',
          'hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800': variant === 'primary',
          
          // Secondary variant
          'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 shadow-gray-xl hover:shadow-gray-2xl': variant === 'secondary',
          'hover:from-gray-200 hover:to-gray-300 active:from-gray-300 active:to-gray-400': variant === 'secondary',
          
          // Outline variant
          'border-2 border-gray-300 bg-white text-gray-800 shadow-sm hover:bg-gray-50': variant === 'outline',
          'hover:border-gray-400 active:bg-gray-100': variant === 'outline',
          
          // Ghost variant
          'text-gray-600 hover:bg-gray-100 hover:text-gray-800': variant === 'ghost',
          'active:bg-gray-200': variant === 'ghost',
        },
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
        </div>
      ) : null}
      <span className={cn({ 'opacity-0': isLoading })}>{children}</span>
    </button>
  );
}