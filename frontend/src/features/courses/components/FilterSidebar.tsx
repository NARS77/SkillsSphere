import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { type Category, type CatalogFilters, type CourseDifficulty } from '../types';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface FilterSidebarProps {
  filters: CatalogFilters;
  onChange: (newFilters: CatalogFilters) => void;
  onClear: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onChange, onClear }) => {
  // Fetch categories with counts using React Query
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories', 'with_counts'],
    queryFn: async () => {
      const response = await api.get('categories/?with_counts=true');
      return response.data;
    },
  });

  const handleDifficultyChange = (difficulty: CourseDifficulty) => {
    if (filters.difficulty === difficulty) {
      onChange({ ...filters, difficulty: '' }); // Toggle off
    } else {
      onChange({ ...filters, difficulty });
    }
  };

  const handlePriceChange = (field: 'min_price' | 'max_price', valStr: string) => {
    const value = valStr === '' ? undefined : parseFloat(valStr);
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/40">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-brand-600" />
          Filter & Sort
        </h3>
        {(filters.category || filters.difficulty || filters.min_price || filters.max_price || filters.search || filters.sort_by) && (
          <button
            onClick={onClear}
            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Text Search Input */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
          Search
        </label>
        <div className="relative rounded-lg shadow-sm">
          <input
            type="text"
            placeholder="Search courses..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full text-xs block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 pl-3 pr-10 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Sort By Dropdown */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
          Sort By
        </label>
        <select
          value={filters.sort_by || ''}
          onChange={(e) => onChange({ ...filters, sort_by: e.target.value })}
          className="w-full text-xs block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Newest Release</option>
          <option value="oldest">Oldest Release</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="title_asc">Title: A-Z</option>
          <option value="title_desc">Title: Z-A</option>
        </select>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
          Categories
        </label>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange({ ...filters, category: filters.category === cat.slug ? undefined : cat.slug })}
              className={`
                flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg transition-all duration-150
                ${filters.category === cat.slug
                  ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 font-bold border border-brand-100 dark:border-brand-900/30'
                  : 'text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-850 border border-transparent'
                }
              `}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                {cat.course_count || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Checkboxes */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
          Difficulty Level
        </label>
        <div className="flex flex-col gap-2">
          {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as CourseDifficulty[]).map((level) => {
            const labels = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' };
            return (
              <label key={level} className="flex items-center gap-2.5 text-xs text-slate-650 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filters.difficulty === level}
                  onChange={() => handleDifficultyChange(level)}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span>{labels[level]}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">
          Price Range ($)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.min_price !== undefined ? filters.min_price : ''}
            onChange={(e) => handlePriceChange('min_price', e.target.value)}
            className="w-full text-xs block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 px-2.5 focus:outline-none focus:border-brand-500"
          />
          <span className="text-slate-450 dark:text-slate-600 text-xs">to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.max_price !== undefined ? filters.max_price : ''}
            onChange={(e) => handlePriceChange('max_price', e.target.value)}
            className="w-full text-xs block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 px-2.5 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
};
