import React from 'react';
import { Moon, Sun, Sunset } from 'lucide-react';
import { useTheme } from '../contexts/theme-context';
import type { Theme } from '../lib/types';

const themeIcons = {
  default: Moon,
  ocean: Sun,
  sunset: Sunset,
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  
  const themes: Theme[] = ['default', 'ocean', 'sunset'];
  const Icon = themeIcons[theme];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg bg-navy-400/20 p-1">
        {themes.map((t) => {
          const ThemeIcon = themeIcons[t];
          return (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-2 rounded-md transition-all duration-200 ${
                theme === t
                  ? 'bg-navy-400/40 text-surface-white shadow-lg'
                  : 'text-navy-200 hover:text-surface-white'
              }`}
            >
              <ThemeIcon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}