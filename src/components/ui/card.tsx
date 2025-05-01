//src/components/ui/card.tsx
import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'flat' | 'pressed';
  interactive?: boolean;
  hoverable?: boolean;
}

export function Card({
  className,
  variant = 'raised',
  interactive = false,
  hoverable = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        {
          // Raised variant (default)
          'bg-navy-400/10 border border-navy-300/20': variant === 'raised',
          'shadow-lg shadow-navy-300/5': variant === 'raised',
          
          // Flat variant
          'bg-navy-400/20 border border-navy-300/20': variant === 'flat',
          'shadow-sm': variant === 'flat',
          
          // Pressed variant
          'bg-navy-400/30 border border-navy-300/20': variant === 'pressed',
          'shadow-inner': variant === 'pressed',
          
          // Interactive states
          'cursor-pointer': interactive,
          'hover:scale-[1.02] hover:bg-navy-400/40': interactive && hoverable,
          'active:scale-[0.98]': interactive,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mb-4 space-y-1.5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-2xl font-semibold leading-none tracking-tight text-surface-white',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-surface-white/70', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-4 flex items-center', className)}
      {...props}
    >
      {children}
    </div>
  );
}