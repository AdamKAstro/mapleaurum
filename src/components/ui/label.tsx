// src/components/ui/label.tsx
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority"; // If you use CVA

import { cn } from "../../lib/utils"; // Adjust path if needed

// Optional: Define variants if you need different label styles
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  // Add variant definitions here if needed, e.g.,
  // variants: { size: { default: "text-sm", large: "text-base" } },
  // defaultVariants: { size: "default" }
);

// Update props type if using CVA variants: VariantProps<typeof labelVariants>
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> /* & VariantProps<typeof labelVariants> */
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // Apply variants if used: cn(labelVariants({ size: props.size }), className)
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };