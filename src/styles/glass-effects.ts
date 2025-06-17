// src/styles/glass-effects.ts
import { cn } from '../lib/utils';

// Your chosen premium glass effect as the base
const PREMIUM_GLASS_BASE = 'transition-all duration-300 glass-blur-lg glass-opacity-15 glass-border-thick glass glass-rotate glass-metallic';

// Define variations for different component sizes and contexts
export const GLASS_EFFECTS = {
  // For main containers and cards
  card: cn(PREMIUM_GLASS_BASE, 'rounded-xl p-6'),
  
  // A slightly smaller version for side panels or info boxes
  panel: cn(PREMIUM_GLASS_BASE, 'rounded-xl p-4'),

  // Adjusted for smaller, non-circular badges
  badge: cn(PREMIUM_GLASS_BASE, 'rounded-lg px-2.5 py-1.5'),

  // For interactive buttons
  button: cn(PREMIUM_GLASS_BASE, 'rounded-lg px-6 py-3'),

  // Tooltip variation
  tooltip: cn(PREMIUM_GLASS_BASE, 'rounded-lg p-3'),
  
  // A static version (without rotation) for performance-critical areas
  staticCard: cn(PREMIUM_GLASS_BASE.replace('glass-rotate', ''), 'rounded-xl p-6'),
};