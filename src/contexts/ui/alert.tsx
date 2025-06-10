//src/components/ui/alert.tsx


import React from 'react';
import { cn } from '../../lib/utils'; // Assuming you have a utility for classNames

interface AlertProps {
  variant?: 'default' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

interface AlertTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ variant = 'default', className, children }) => {
  const variantStyles = {
    default: 'bg-navy-600/80 border-navy-500 text-gray-200',
    destructive: 'bg-red-500/80 border-red-600 text-white',
  };

  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

export const AlertTitle: React.FC<AlertTitleProps> = ({ className, children }) => {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)}>
      {children}
    </h5>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ className, children }) => {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)}>
      {children}
    </div>
  );
};