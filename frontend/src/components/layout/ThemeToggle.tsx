import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage or document class list
    const isDarkTheme = document.documentElement.classList.contains('dark') || 
      localStorage.getItem('skillsphere-theme') === 'dark';
    
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('skillsphere-theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('skillsphere-theme', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      tabIndex={0}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      className="p-2 border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition-colors cursor-pointer"
    >
      {isDark ? <Sun className="h-4.5 w-4.5 text-amber-450" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
};
