//src/components/ui/sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Table2, LineChart, Filter, Crown, ChevronLeft, ChevronRight, Calculator, HelpCircle, BookOpen, Target, Gauge, ScatterChart as Scatter, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNavItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/companies", label: "Companies", icon: Table2 },
    { path: "/scatter-chart", label: "Scatter Chart", icon: Scatter },
    { path: "/filter", label: "Filters", icon: Filter },
    { path: "/scoring", label: "Scoring", icon: Calculator },
    { path: "/subscribe", label: "Subscribe", icon: Crown },
  ];

  const helpNavItems = [
    { path: "/help", label: "Help Overview", icon: HelpCircle },
    { path: "/help/metrics", label: "Metrics Guide", icon: Gauge },
    { path: "/help/filters", label: "Filters Guide", icon: Filter },
    { path: "/help/scoring", label: "Scoring Guide", icon: Target },
    { path: "/help/scatter-chart", label: "Scatter Guide", icon: Scatter },
    { path: "/help/tiers", label: "Subscription Tiers", icon: Award },
    { path: "/help/general", label: "General & FAQ", icon: BookOpen },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? '64px' : '224px',
      }}
      className={cn(
        "relative flex-shrink-0 border-r border-navy-300/20 bg-navy-500/95 backdrop-blur",
        "supports-[backdrop-filter]:bg-navy-500/60 transition-all duration-300"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-6 z-50",
          "flex h-6 w-6 items-center justify-center",
          "rounded-full border border-navy-300/20 bg-navy-400",
          "text-surface-white/70 hover:text-surface-white",
          "transition-colors hover:bg-navy-300"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className="flex h-full flex-col gap-4">
        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <div className="mb-4">
            <h3 className={cn(
              "px-2 text-xs font-medium uppercase tracking-wider text-surface-white/50",
              isCollapsed && "opacity-0"
            )}>
              Navigation
            </h3>
          </div>

          {mainNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  "hover:bg-navy-400/20",
                  isActive
                    ? "bg-navy-400/30 text-surface-white font-medium"
                    : "text-surface-white/70 hover:text-surface-white",
                  isCollapsed && "justify-center"
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Help Navigation Section */}
          <div className="mt-8 pt-4 border-t border-navy-400/30">
            <h3 className={cn(
              "px-2 text-xs font-medium uppercase tracking-wider text-surface-white/50 mb-4",
              isCollapsed && "opacity-0"
            )}>
              Help & Support
            </h3>

            {helpNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/help'}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    "hover:bg-navy-400/20",
                    isActive
                      ? "bg-navy-400/30 text-surface-white font-medium"
                      : "text-surface-white/70 hover:text-surface-white",
                    isCollapsed && "justify-center"
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-navy-300/20 p-4",
          isCollapsed && "flex justify-center"
        )}>
          <div className={cn(
            "flex items-center gap-2 px-2",
            isCollapsed && "px-0"
          )}>
            <div className="h-2 w-2 rounded-full bg-accent-teal/80" />
            {!isCollapsed && (
              <span className="text-xs text-surface-white/50">
                Mining Analytics v1.0
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}