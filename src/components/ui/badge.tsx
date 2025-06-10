//src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent backdrop-blur-md border border-solid before:absolute before:inset-0 before:rounded-full before:bg-white/5",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-500/10 to-blue-600/20 text-blue-100 border-blue-400/30 hover:from-blue-500/20 hover:to-blue-600/30 hover:border-blue-300/40 hover:shadow-lg shadow-md focus:ring-blue-400/50",
        secondary:
          "bg-gradient-to-r from-gray-400/10 to-gray-500/20 text-gray-100 border-gray-300/30 hover:from-gray-400/20 hover:to-gray-500/30 hover:border-gray-200/40 hover:shadow-lg shadow-md focus:ring-gray-300/50",
        destructive:
          "bg-gradient-to-r from-red-500/10 to-red-600/20 text-red-100 border-red-400/30 hover:from-red-500/20 hover:to-red-600/30 hover:border-red-300/40 hover:shadow-lg shadow-md focus:ring-red-400/50",
        outline: 
          "bg-white/5 text-gray-100 border-white/30 hover:bg-white/10 hover:border-white/40 hover:shadow-lg shadow-md focus:ring-white/40",
        success:
          "bg-gradient-to-r from-emerald-500/10 to-emerald-600/20 text-emerald-100 border-emerald-400/30 hover:from-emerald-500/20 hover:to-emerald-600/30 hover:border-emerald-300/40 hover:shadow-lg shadow-md focus:ring-emerald-400/50",
        warning:
          "bg-gradient-to-r from-amber-500/10 to-amber-600/20 text-amber-100 border-amber-400/30 hover:from-amber-500/20 hover:to-amber-600/30 hover:border-amber-300/40 hover:shadow-lg shadow-md focus:ring-amber-400/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <div className={cn("relative", badgeVariants({ variant }), className)} {...props}>
      {/* Glass shine effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
      
      {/* Content */}
      <span className="relative z-10">{children}</span>
    </div>
  )
}

export { Badge, badgeVariants }