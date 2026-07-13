import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Search, Loader2, BookOpen, MessageSquare, User, FileText, Bookmark } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch search results (debounce search by query length)
  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search-results', query],
    queryFn: async () => {
      if (!query.trim()) return null;
      const res = await api.get(`search/?q=${encodeURIComponent(query)}`);
      return res.data;
    },
    enabled: query.trim().length >= 2,
    staleTime: 5000
  });

  // Fetch Saved Searches
  const { data: savedSearches = [], refetch: refetchSaved } = useQuery<any[]>({
    queryKey: ['my-saved-searches'],
    queryFn: async () => {
      const res = await api.get('saved-searches/');
      return res.data.results || res.data;
    }
  });

  // Save Search Mutation
  const saveSearchMutation = useMutation({
    mutationFn: async () => {
      await api.post('saved-searches/', { query, filters: {} });
    },
    onSuccess: () => {
      refetchSaved();
    }
  });

  const handleSelectResult = (url: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(url);
  };

  const handleSaveSearch = () => {
    if (!query.trim()) return;
    saveSearchMutation.mutate();
  };

  const hasResults = results && (
    (results.courses?.length || 0) > 0 ||
    (results.lessons?.length || 0) > 0 ||
    (results.discussions?.length || 0) > 0 ||
    (results.instructors?.length || 0) > 0
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xs md:max-w-sm text-xs">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450 dark:text-slate-550" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search courses, lessons, Q&A..."
          className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100 transition-colors"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden max-h-[450px] overflow-y-auto">
          {/* Saved Searches */}
          {query.trim().length < 2 && savedSearches.length > 0 && (
            <div className="p-3 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Saved Searches</p>
              <div className="flex flex-wrap gap-1.5">
                {savedSearches.map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setQuery(s.query);
                      setIsOpen(true);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-slate-700 text-slate-655 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Bookmark className="h-3 w-3" />
                    {s.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim().length >= 2 && !isLoading && (
            <div className="p-3 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-950/20">
              <span className="text-[10px] font-bold text-slate-450 uppercase">Search Outcomes</span>
              <button
                type="button"
                onClick={handleSaveSearch}
                className="text-[10px] text-brand-600 hover:underline font-semibold"
                disabled={saveSearchMutation.isPending}
              >
                Save this search
              </button>
            </div>
          )}

          {query.trim().length >= 2 && hasResults && results && (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {/* Courses */}
              {results.courses?.length > 0 && (
                <div className="p-3.5 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Courses
                  </h4>
                  <div className="space-y-1">
                    {results.courses.map((c: any) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectResult(`/courses/${c.slug}`)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-950/45 cursor-pointer rounded-lg font-bold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <p className="line-clamp-1">{c.title}</p>
                        <span className="text-[9px] font-medium text-slate-400">{c.short_description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lessons */}
              {results.lessons?.length > 0 && (
                <div className="p-3.5 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Lessons
                  </h4>
                  <div className="space-y-1">
                    {results.lessons.map((l: any) => (
                      <div
                        key={l.id}
                        onClick={() => handleSelectResult(`/courses/${l.course_slug}/learn`)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-950/45 cursor-pointer rounded-lg font-bold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <p className="line-clamp-1">{l.title}</p>
                        <span className="text-[9px] font-medium text-slate-400">In Course: {l.course_title} ({l.lesson_type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussions */}
              {results.discussions?.length > 0 && (
                <div className="p-3.5 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Discussions
                  </h4>
                  <div className="space-y-1">
                    {results.discussions.map((d: any) => (
                      <div
                        key={d.id}
                        onClick={() => handleSelectResult(`/courses/${d.course_slug}/learn`)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-950/45 cursor-pointer rounded-lg font-bold text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <p className="line-clamp-1">{d.title}</p>
                        <span className="text-[9px] font-medium text-slate-400">Q&A under: {d.course_title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructors */}
              {results.instructors?.length > 0 && (
                <div className="p-3.5 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Instructors
                  </h4>
                  <div className="space-y-1">
                    {results.instructors.map((i: any) => (
                      <div
                        key={i.id}
                        onClick={() => handleSelectResult(`/courses`)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-slate-950/45 cursor-pointer rounded-lg font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-2"
                      >
                        <span className="h-6 w-6 rounded-full bg-brand-50 flex items-center justify-center font-bold text-[10px] text-brand-600 shrink-0">
                          {i.username.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p>{i.name}</p>
                          <span className="text-[9px] font-medium text-slate-400">{i.headline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {query.trim().length >= 2 && !isLoading && !hasResults && (
            <div className="p-8 text-center text-slate-400 font-light">
              No results found matching "{query}"
            </div>
          )}

          {query.trim().length > 0 && query.trim().length < 2 && (
            <div className="p-8 text-center text-slate-400 font-light">
              Type at least 2 characters to search globally...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
