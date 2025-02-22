'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

interface AppFeatures {
  isDark: boolean;
  toggleTheme: () => void;
  shortcuts: {
    name: string;
    key: string;
    description: string;
  }[];
}

export function useAppFeatures(): AppFeatures {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const shortcuts = [
    { name: 'search', key: '⌘ K', description: 'Search orders' },
    { name: 'theme', key: '⌘ T', description: 'Toggle theme' },
    { name: 'refresh', key: '⌘ R', description: 'Refresh data' },
    { name: 'nextPage', key: '→', description: 'Next page' },
    { name: 'prevPage', key: '←', description: 'Previous page' },
    { name: 'escape', key: 'ESC', description: 'Clear filters' },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key === 't') {
        e.preventDefault();
        toggleTheme();
      }

      if (cmd && e.key === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[name="search"]')?.focus();
      }

      if (cmd && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        // Add clear filters logic here
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [theme]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    isDark: theme === 'dark',
    toggleTheme,
    shortcuts,
  };
}