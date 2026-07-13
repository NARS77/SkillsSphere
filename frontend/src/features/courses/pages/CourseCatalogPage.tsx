import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { type Course, type Category, type CatalogFilters } from '../types';
import { CourseCard } from '../../../components/ui/CourseCard';
import { FilterSidebar } from '../components/FilterSidebar';
import { CategoryBadge } from '../components/CategoryBadge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Button } from '../../../components/ui/Button';
import { BookOpen, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export const CourseCatalogPage: React.FC = () => {
  const [filters, setFilters] = useState<CatalogFilters>({
    page: 1,
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch published categories for top quick filter bar
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories', 'catalog_bar'],
    queryFn: async () => {
      const response = await api.get('categories/');
      return Array.isArray(response.data) ? response.data : (response.data.results || []);
    },
  });

  // Fetch paginated catalog from backend API using filters
  const { data, isLoading, error } = useQuery<{
    count: number;
    next: string | null;
    previous: string | null;
    results: Course[];
  }>({
    queryKey: ['catalog', filters],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.min_price !== undefined) params.min_price = filters.min_price;
      if (filters.max_price !== undefined) params.max_price = filters.max_price;
      if (filters.sort_by) params.sort_by = filters.sort_by;
      if (filters.page) params.page = filters.page;

      const response = await api.get('catalog/', { params });
      return response.data;
    },
  });

  const handleFilterChange = (newFilters: CatalogFilters) => {
    // Reset to page 1 on filter change
    setFilters({ ...newFilters, page: 1 });
  };

  const handleCategorySelect = (categorySlug: string) => {
    if (filters.category === categorySlug) {
      handleFilterChange({ ...filters, category: undefined });
    } else {
      handleFilterChange({ ...filters, category: categorySlug });
    }
  };

  const handleClearFilters = () => {
    setFilters({ page: 1 });
  };

  const totalPages = data ? Math.ceil(data.count / 6) : 0;
  const activePage = filters.page || 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Minimal Header Banner */}
      <div className="border-b border-slate-200/50 dark:border-slate-900/60 bg-white dark:bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Explore Professional Courses
          </h1>
          <p className="max-w-xl mx-auto text-slate-500 dark:text-slate-400 text-xs leading-normal font-light">
            Learn from top industry practitioners. Gain real-world software skills, unlock certificates, and boost your engineering career.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Quick Categories Filter Bar */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200/40 dark:border-slate-800/20">
            {categories.map((cat) => (
              <CategoryBadge
                key={cat.id}
                category={cat}
                active={filters.category === cat.slug}
                onClick={() => handleCategorySelect(cat.slug)}
              />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Filters Sidebar - Collapsible on Mobile */}
          <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block lg:col-span-1 bg-white dark:bg-slate-900 lg:bg-transparent p-6 lg:p-0 rounded-xl border lg:border-0 border-slate-200/60 dark:border-slate-850/60`}>
            <FilterSidebar
              filters={filters}
              onChange={(f) => {
                handleFilterChange(f);
                setShowMobileFilters(false);
              }}
              onClear={() => {
                handleClearFilters();
                setShowMobileFilters(false);
              }}
            />
          </div>

          {/* Course Catalog Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Header info / Mobile filters trigger */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <p>
                {isLoading ? (
                  <Skeleton variant="text" className="w-32 h-4" />
                ) : (
                  <span>Showing {data?.results.length || 0} of {data?.count || 0} courses</span>
                )}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="lg:hidden text-[10px] py-1 px-3"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                {showMobileFilters ? 'Hide Filters' : 'Filter & Sort'}
              </Button>
            </div>

            {/* Error state */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-450 rounded-xl p-5 flex gap-3 items-center">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span className="text-xs font-semibold">Failed to fetch courses. Please try again.</span>
              </div>
            )}

            {/* Loading Grid */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="border border-slate-200/60 dark:border-slate-800/40 rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900/50 flex flex-col space-y-4 h-[350px]">
                    <Skeleton className="h-44 w-full" />
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <Skeleton variant="text" className="w-1/3" />
                        <Skeleton variant="text" className="w-full" />
                        <Skeleton variant="text" className="w-4/5" />
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <Skeleton variant="text" className="w-1/4" />
                        <Skeleton variant="text" className="w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && data?.results.length === 0 && (
              <div className="py-20 text-center space-y-4 bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/40 rounded-xl">
                <BookOpen className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto" />
                <div className="space-y-1 max-w-sm mx-auto">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">No courses match your query</p>
                  <p className="text-xs text-slate-400 font-light leading-normal">Try adjusting your filters, modifying keywords, or clear all filters to start browsing again.</p>
                </div>
              </div>
            )}

            {/* Catalog Grid */}
            {!isLoading && data && data.results.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {data.results.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/40 pt-6">
                <button
                  disabled={activePage === 1}
                  onClick={() => setFilters({ ...filters, page: activePage - 1 })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setFilters({ ...filters, page: pageNum })}
                        className={`
                          h-8 w-8 rounded-lg text-xs font-bold transition-all duration-150
                          ${activePage === pageNum
                            ? 'bg-indigo-650 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                          }
                        `}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={activePage === totalPages}
                  onClick={() => setFilters({ ...filters, page: activePage + 1 })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
