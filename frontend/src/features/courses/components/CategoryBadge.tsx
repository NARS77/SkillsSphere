import React from 'react';
import * as Icons from 'lucide-react';
import { type Category } from '../types';

interface CategoryBadgeProps {
  category: Category;
  active?: boolean;
  onClick?: () => void;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, active = false, onClick }) => {
  const { name, icon, color } = category;
  
  // Find Lucide Icon dynamically, capitalize first letter, fallback to BookOpen
  const lucideKey = icon.charAt(0).toUpperCase() + icon.slice(1);
  const IconComponent = (Icons as any)[lucideKey] || Icons.BookOpen;

  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-250 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400',
    emerald: 'bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400',
    rose: 'bg-rose-50 border-rose-250 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400',
    amber: 'bg-amber-50 border-amber-250 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400',
    violet: 'bg-violet-50 border-violet-250 text-violet-700 dark:bg-violet-950/20 dark:border-violet-900/30 dark:text-violet-400',
    brand: 'bg-brand-50 border-brand-250 text-brand-700 dark:bg-brand-950/20 dark:border-brand-900/30 dark:text-brand-400',
  };

  const badgeColor = colorClasses[color] || colorClasses.brand;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-200
        ${active 
          ? `${badgeColor} ring-2 ring-offset-0 ring-brand-500/10 scale-[1.02] shadow-sm` 
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
        }
      `}
    >
      <IconComponent className="h-4 w-4" />
      <span>{name}</span>
    </button>
  );
};
