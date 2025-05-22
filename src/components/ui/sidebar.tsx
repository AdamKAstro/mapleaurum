// src/components/ui/sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Table2,
  LineChart,
  Filter,
  Crown,
  ChevronLeft,
  ChevronRight,
  Calculator,
  HelpCircle,
  BookOpen,
  Target,
  Gauge,
  ScatterChart as Scatter,
  Award,
  TrendingUp, // Using TrendingUp as discussed
  // Consider another icon if TrendingUp is too similar to Analytics Tools or for future differentiation
  // For example: Brain, Puzzle, Edit, SlidersHorizontal, Component
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNavItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/companies", label: "Companies", icon: Table2 },
    { path: "/scatter-chart", label: "Scatter Chart", icon: Scatter },
    { path: "/scatter-score-pro", label: "ScatterScore", icon: TrendingUp }, // <-- NEW ITEM
    { path: "/filter", label: "Filters", icon: Filter },
    { path: "/scoring", label: "Scoring", icon: Calculator },
    // "/analytics-tools" might be a landing page for scatter, scoring, scatter-score
    // If so, ensure consistent tier access logic in Header and here.
    // { path: "/analytics-tools", label: "Analytics Tools", icon: LineChart }, 
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
        width: isCollapsed ? '64px' : '224px', // Standard widths
      }}
      className={cn(
        "relative flex-shrink-0 border-r border-navy-700 bg-navy-800", // Adjusted colors slightly for example
        "transition-all duration-300 ease-in-out" // Smoother transition
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-8 z-50", // Adjusted top position slightly
          "flex h-6 w-6 items-center justify-center",
          "rounded-full border border-navy-600 bg-navy-700",
          "text-gray-300 hover:text-white",
          "transition-colors hover:bg-navy-600 focus:outline-none focus:ring-2 focus:ring-accent-teal"
        )}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div className="flex h-full flex-col gap-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-navy-700/50">
        <nav className="flex-1 space-y-1 px-3 py-4"> {/* Adjusted padding */}
          <div className="mb-3">
            <h3 className={cn(
              "px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-opacity duration-150",
              isCollapsed ? "opacity-0 h-0 invisible" : "opacity-100 h-auto visible" // Handle collapse better
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
                  "flex items-center gap-x-3.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors", // Adjusted padding & gap
                  "hover:bg-navy-700 hover:text-white",
                  isActive
                    ? "bg-accent-teal/10 text-accent-teal font-semibold" // Example active style
                    : "text-gray-300 hover:text-white",
                  isCollapsed && "justify-center !px-0" // Ensure icon centered when collapsed
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-4 w-4 flex-shrink-0", isCollapsed && "h-5 w-5")} /> {/* Slightly larger icon when collapsed */}
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}

          <div className="mt-6 pt-4 border-t border-navy-700">
            <h3 className={cn(
              "px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 transition-opacity duration-150",
              isCollapsed ? "opacity-0 h-0 invisible" : "opacity-100 h-auto visible"
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
                    "flex items-center gap-x-3.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    "hover:bg-navy-700 hover:text-white",
                    isActive
                      ? "bg-accent-teal/10 text-accent-teal font-semibold"
                      : "text-gray-300 hover:text-white",
                    isCollapsed && "justify-center !px-0"
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-4 w-4 flex-shrink-0", isCollapsed && "h-5 w-5")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className={cn(
          "border-t border-navy-700 p-3 mt-auto", // Use padding consistent with nav items
          isCollapsed && "flex justify-center"
        )}>
          <div className={cn(
            "flex items-center gap-2",
            isCollapsed && "!px-0"
          )}>
            <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" /> {/* Example status dot */}
            {!isCollapsed && (
              <span className="text-xs text-gray-400 transition-opacity duration-150 truncate">
                MapleAurum v1.1 {/* Example version */}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}