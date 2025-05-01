import React, { createContext, useContext, useState } from 'react';
import type { Theme, ThemeConfig } from '../lib/types';

export const themes: Record<Theme, ThemeConfig> = {
  default: {
    name: 'default',
    label: 'Modern Dark',
    colors: {
      background: 'bg-navy-500',
      foreground: 'text-surface-white',
      accent: 'accent-red',
      muted: 'text-navy-200',
    },
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean Depths',
    colors: {
      background: 'bg-blue-900',
      foreground: 'text-blue-50',
      accent: 'accent-teal',
      muted: 'text-blue-200',
    },
  },
  sunset: {
    name: 'sunset',
    label: 'Desert Sunset',
    colors: {
      background: 'bg-amber-900',
      foreground: 'text-amber-50',
      accent: 'accent-yellow',
      muted: 'text-amber-200',
    },
  },
};

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: 'default',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('default');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`${themes[theme].colors.background} min-h-screen transition-colors duration-300`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}