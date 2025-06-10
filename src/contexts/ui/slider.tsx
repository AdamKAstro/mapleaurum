// src/components/ui/slider.tsx
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "../../lib/utils"; // Adjust path if needed

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center group",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-600" // Slightly thinner track
    >
      <SliderPrimitive.Range
        className="absolute h-full bg-teal-500 group-disabled:bg-teal-500/50" // Accent color range, faded when disabled
      />
    </SliderPrimitive.Track>
    {/* Render thumb based on value prop (array or number) */}
    {(Array.isArray(props.value) ? props.value : [props.value ?? props.defaultValue ?? 0]).map((_, i) => (
       <SliderPrimitive.Thumb
         key={i}
         className={cn(
          "block h-3.5 w-3.5 rounded-full border-2 border-teal-500 bg-gray-900", // Thumb style
          "ring-offset-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2", // Focus style
          "disabled:pointer-events-none disabled:opacity-50", // Disabled style
          "transition-colors cursor-pointer"
         )}
       />
     ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };