//src/components/ui/typography.tsx
import React, { forwardRef, HTMLAttributes, ElementType } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'h1' | 'h2' | 'h3' | 'h4' | 'subtitle' | 'body' | 'bodySmall' | 'caption' | 'label';

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: Variant;
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  as?: ElementType;
  className?: string;
}

const variantMapping: Record<Variant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  subtitle: 'h6',
  body: 'p',
  bodySmall: 'p', // Added bodySmall
  caption: 'span',
  label: 'label',
};

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ variant = 'body', weight = 'normal', as, className, children, ...props }, ref) => {
    const Component: ElementType = as || variantMapping[variant] || 'p';

    // Log invalid variant for debugging
    if (!variantMapping[variant]) {
      console.warn(`[Typography] Invalid variant: ${variant}. Falling back to 'p'.`);
    }

    return (
      <Component
        ref={ref}
        className={cn(
          'text-gray-100',
          {
            'text-4xl md:text-5xl lg:text-6xl leading-tight': variant === 'h1',
            'text-3xl md:text-4xl lg:text-5xl leading-tight': variant === 'h2',
            'text-2xl md:text-3xl lg:text-4xl leading-snug': variant === 'h3',
            'text-xl md:text-2xl lg:text-3xl leading-snug': variant === 'h4',
            'text-lg md:text-xl leading-relaxed': variant === 'subtitle',
            'text-base leading-relaxed': variant === 'body',
            'text-sm leading-relaxed font-normal': variant === 'bodySmall',
            'text-sm leading-relaxed font-light': variant === 'caption',
            'text-sm font-medium leading-relaxed': variant === 'label',
            'font-light': weight === 'light',
            'font-normal': weight === 'normal',
            'font-medium': weight === 'medium',
            'font-semibold': weight === 'semibold',
            'font-bold': weight === 'bold',
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
);

Typography.displayName = 'Typography';