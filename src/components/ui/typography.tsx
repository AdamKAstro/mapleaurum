import React from 'react';
import { cn } from '../../lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'subtitle' | 'body' | 'caption';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  as?: keyof JSX.IntrinsicElements;
}

export function Typography({
  variant = 'body',
  weight = 'normal',
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  const Component = as || {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    subtitle: 'h6',
    body: 'p',
    caption: 'span',
  }[variant];

  return (
    <Component
      className={cn(
        'text-gray-900',
        {
          // Font sizes and line heights
          'text-4xl md:text-5xl lg:text-6xl leading-tight': variant === 'h1',
          'text-3xl md:text-4xl lg:text-5xl leading-tight': variant === 'h2',
          'text-2xl md:text-3xl lg:text-4xl leading-snug': variant === 'h3',
          'text-xl md:text-2xl lg:text-3xl leading-snug': variant === 'h4',
          'text-lg md:text-xl leading-relaxed': variant === 'subtitle',
          'text-base leading-relaxed': variant === 'body',
          'text-sm leading-relaxed': variant === 'caption',

          // Font weights
          'font-light': weight === 'light',
          'font-normal': weight === 'normal',
          'font-medium': weight === 'medium',
          'font-semibold': weight === 'semibold',
          'font-bold': weight === 'bold',

          // Additional styles for headings
          'font-bold tracking-tight': ['h1', 'h2', 'h3', 'h4'].includes(variant),
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}