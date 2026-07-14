import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { Button } from '../components/ui/Button';
import { User, LogOut, Menu, X, BookOpen, LayoutDashboard, Settings, Shield } from 'lucide-react';
import { GlobalSearch } from '../components/layout/GlobalSearch';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { useConfigStore } from '../store/configStore';
import { GuidedTour } from '../components/ui/GuidedTour';

export const MainLayout: React.FC = () => {
  const { user, isAuthenticated, clearSession } = useAuthStore();
  const { DEMO_MODE } = useConfigStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const logoRedirectPath = isAuthenticated ? '/dashboard' : '/';
  
  const [isBannerDismissed, setIsBannerDismissed] = useState(() => {
    return localStorage.getItem('demo_banner_dismissed') === 'true';
  });

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    localStorage.setItem('demo_banner_dismissed', 'true');
  };

  // Close mobile menu when URL changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    clearSession();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <GuidedTour />
      
      {/* Demo Banner */}
      {DEMO_MODE && !isBannerDismissed && (
        <div className="w-full bg-indigo-50 dark:bg-indigo-950/20 border-b border-indigo-200/40 dark:border-indigo-900/40 px-4 py-2 text-xs flex justify-between items-center text-indigo-700 dark:text-indigo-300 font-light select-none z-50">
          <div className="flex items-center gap-2 max-w-2xl text-left">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white uppercase tracking-wider shrink-0">
              🎓 SkillSphere Demo
            </span>
            <p className="leading-normal">
              You are exploring a public demo of SkillSphere. Some destructive operations are disabled.
            </p>
          </div>
          <button 
            onClick={handleDismissBanner} 
            className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors p-1 cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 dark:border-slate-900/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={logoRedirectPath} className="flex items-center gap-2 transition-all duration-150" aria-label="SkillSphere Home">
            <img 
              src="/favicon.png" 
              alt="SkillSphere Icon" 
              className="h-8 w-auto transition-transform duration-200 hover:opacity-90" 
            />
            <span className="font-outfit font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
              SkillSphere
            </span>
          </Link>

          {/* Desktop Search */}
          <div className="hidden md:block flex-1 max-w-xs mx-6">
            <GlobalSearch />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            <Link to="/courses" className="transition-colors hover:text-indigo-650 dark:hover:text-indigo-400">Courses</Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className="transition-colors hover:text-indigo-650 dark:hover:text-indigo-400">My Dashboard</Link>
                <Link to="/settings" className="transition-colors hover:text-indigo-650 dark:hover:text-indigo-400">Settings</Link>
              </>
            )}
            {isAuthenticated && user && user.role === 'INSTRUCTOR' && (
              <Link to="/instructor/courses" className="transition-colors hover:text-indigo-650 dark:hover:text-indigo-400">Instructor Console</Link>
            )}
            {isAuthenticated && user && user.role === 'ADMIN' && (
              <Link to="/admin-console" className="transition-colors hover:text-indigo-650 dark:hover:text-indigo-400">Admin Console</Link>
            )}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            
            {/* Desktop Auth Controls */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-900 text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800/40">
                    <User className="h-3 w-3" />
                    {user.role}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {user.username}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Join Free</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-600 dark:text-slate-300 p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}>
        {/* Backdrop */}
        <div 
          className={`fixed inset-0 bg-slate-950/20 backdrop-blur-sm transition-opacity duration-200 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Slide-out Drawer Panel */}
        <div className={`fixed inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-slate-950 p-6 border-l border-slate-200 dark:border-slate-900 shadow-xl flex flex-col justify-between transition-transform duration-200 ease-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div>
            <div className="flex items-center justify-between mb-8">
              <Link to={logoRedirectPath} className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)} aria-label="SkillSphere Home">
                <img 
                  src="/favicon.png" 
                  alt="SkillSphere Icon" 
                  className="h-8 w-auto" 
                />
                <span className="font-outfit font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  SkillSphere
                </span>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Mobile Search */}
            <div className="mb-6">
              <GlobalSearch />
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-4 text-xs font-semibold">
              <Link to="/courses" className="flex items-center gap-3 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                <BookOpen className="h-4.5 w-4.5 text-slate-400" />
                Courses
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/dashboard" className="flex items-center gap-3 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <LayoutDashboard className="h-4.5 w-4.5 text-slate-400" />
                    My Dashboard
                  </Link>
                  <Link to="/settings" className="flex items-center gap-3 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <Settings className="h-4.5 w-4.5 text-slate-400" />
                    Account Settings
                  </Link>
                </>
              )}
              {isAuthenticated && user && user.role === 'INSTRUCTOR' && (
                <Link to="/instructor/courses" className="flex items-center gap-3 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  <Settings className="h-4.5 w-4.5 text-slate-400" />
                  Instructor Console
                </Link>
              )}
              {isAuthenticated && user && user.role === 'ADMIN' && (
                <Link to="/admin-console" className="flex items-center gap-3 py-2 text-slate-500 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                  <Shield className="h-4.5 w-4.5 text-slate-400" />
                  Admin Console
                </Link>
              )}
            </nav>
          </div>

          {/* Mobile Footer Auth */}
          <div className="border-t border-slate-100 dark:border-slate-900 pt-6">
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-650 dark:text-slate-350 font-bold uppercase border border-slate-200/50 dark:border-slate-800/40">
                    {user.username.substring(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{user.username}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{user.role}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link to="/login" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link to="/register" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full">Join Free</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-200/50 dark:border-slate-900/60 bg-white dark:bg-slate-950 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-450">
          <p>© {new Date().getFullYear()} SkillSphere. All rights reserved.</p>
          <div className="flex items-center gap-6 font-medium">
            <Link to="/terms" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
