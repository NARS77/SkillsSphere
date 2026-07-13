import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { EmailVerifyPage } from './features/auth/pages/EmailVerifyPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { AccountSettingsPage } from './features/auth/pages/AccountSettingsPage';
import { ToastContainer } from './components/ui/Toast';
import { Confetti } from './components/ui/Confetti';
import { CookieConsentBanner } from './components/layout/CookieConsentBanner';
import { useAuthStore } from './store/authStore';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { 
  ArrowRight, 
  Brain,
  Cpu,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  Play
} from 'lucide-react';

// Import new features/courses pages
import { CourseCatalogPage } from './features/courses/pages/CourseCatalogPage';
import { CourseDetailsPage } from './features/courses/pages/CourseDetailsPage';
import { InstructorDashboardPage } from './features/courses/pages/InstructorDashboardPage';
import { CreateEditCoursePage } from './features/courses/pages/CreateEditCoursePage';
import { StudentDashboardPage } from './features/learning/pages/StudentDashboardPage';
import { LearningPlayerPage } from './features/learning/pages/LearningPlayerPage';
import { CertificateVerifyPage } from './features/learning/pages/CertificateVerifyPage';
import { CheckoutPage } from './features/checkout/pages/CheckoutPage';
import { AdminConsolePage } from './features/admin/pages/AdminConsolePage';
import { TermsPage } from './features/legal/pages/TermsPage';
import { PrivacyPage } from './features/legal/pages/PrivacyPage';

const queryClient = new QueryClient();

// Role-based Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Landing page for visitors
const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans pb-20">
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)]" />

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 text-center space-y-8 z-10">
        
        {/* Sparkles Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 border border-slate-200/60 dark:border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] select-none">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span className="font-semibold tracking-wide">The Next Generation AI Learning Suite</span>
        </div>
        
        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.1] sm:leading-tight">
          Empower your skills with the <br />
          <span className="bg-gradient-to-r from-indigo-650 to-indigo-400 bg-clip-text text-transparent dark:from-indigo-400 dark:to-indigo-300">
            sphere of intelligence
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-light">
          Experience an AI-first learning management system. Track outcomes, test code real-time, generate smart quizzes, and earn verifiable certificates.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg" className="px-8 shadow-md">
                Go to Dashboard
                <ArrowRight className="h-4.5 w-4.5 ml-2" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg" className="px-8 shadow-md">
                  Get Started Free
                  <ArrowRight className="h-4.5 w-4.5 ml-2" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button variant="outline" size="lg" className="px-8">
                  Browse Catalog
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Immersive Dashboard Mockup Preview */}
        <div className="relative mx-auto max-w-5xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 p-2.5 shadow-2xl backdrop-blur-sm mt-16 overflow-hidden aspect-[16/10] sm:aspect-[16/9]">
          <div className="h-full w-full rounded-lg bg-slate-900 overflow-hidden flex flex-col text-left border border-slate-800/80">
            {/* Mock Header */}
            <div className="h-10 border-b border-slate-800/80 bg-slate-950 px-4 flex items-center justify-between text-[10px] text-slate-400 font-semibold select-none">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-[9px] text-slate-600">skillsphere.academy/dashboard</span>
              </div>
              <div className="flex items-center gap-4 text-[9px]">
                <span>Workspace</span>
                <span>Settings</span>
                <div className="h-5 w-5 rounded-md bg-slate-850" />
              </div>
            </div>
            
            {/* Mock Dashboard Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Mock Sidebar */}
              <div className="w-40 border-r border-slate-800/80 bg-slate-950/80 p-4 space-y-4 hidden sm:block">
                <div className="space-y-1.5">
                  <div className="h-2.5 w-2/3 bg-slate-800 rounded" />
                  <div className="h-2 w-1/2 bg-slate-800/60 rounded" />
                </div>
                <div className="space-y-2 pt-4">
                  <div className="h-4 w-full bg-slate-850 rounded-md" />
                  <div className="h-4 w-5/6 bg-slate-900 rounded-md" />
                  <div className="h-4 w-4/5 bg-slate-900 rounded-md" />
                </div>
              </div>
              
              {/* Mock Content */}
              <div className="flex-1 p-6 space-y-6 bg-slate-950 overflow-y-auto">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="h-4.5 w-44 bg-slate-800 rounded" />
                    <div className="h-2.5 w-28 bg-slate-900 rounded" />
                  </div>
                  <div className="h-7 w-20 bg-indigo-600 rounded-md" />
                </div>
                
                {/* Stats cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="p-3 border border-slate-800/80 bg-slate-900/40 rounded-lg space-y-2">
                      <div className="h-2 w-12 bg-slate-700 rounded" />
                      <div className="h-4 w-8 bg-slate-100 rounded" />
                    </div>
                  ))}
                </div>
                
                {/* Course preview row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-800/80 bg-slate-900/20 rounded-lg flex gap-4 items-center">
                    <div className="h-10 w-16 bg-slate-800 rounded shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-3/4 bg-slate-700 rounded" />
                      <div className="h-2 w-1/2 bg-slate-800 rounded" />
                    </div>
                  </div>
                  <div className="p-4 border border-slate-800/80 bg-slate-900/20 rounded-lg flex gap-4 items-center">
                    <div className="h-10 w-16 bg-slate-800 rounded shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-3/4 bg-slate-700 rounded" />
                      <div className="h-2 w-1/2 bg-slate-800 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features Showcase Grid */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 z-10 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Engineered for high-fidelity SaaS standards
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto font-light leading-relaxed">
            Every component is fully modular, responsive, and optimized for speed and accessibility.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Card className="p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/30 flex flex-col justify-between h-56 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="space-y-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-slate-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800 flex items-center justify-center">
                <Brain className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider">AI Interactive Study Tutor</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
                Ask context-specific queries directly while watching video lessons, and get instant explanations.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/30 flex flex-col justify-between h-56 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="space-y-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-slate-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800 flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-955 dark:text-white uppercase tracking-wider">Verifiable Certificates</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
                Securely generate cryptographic PDF certificates on lesson completion, verifiable directly via verification links.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/30 flex flex-col justify-between h-56 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="space-y-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-slate-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800 flex items-center justify-center">
                <Cpu className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-955 dark:text-white uppercase tracking-wider">Automated Quizzes & Coding</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
                Complete dynamic interactive coding exercises, execute test suites, and compile responses instantly.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/30 flex flex-col justify-between h-56 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="space-y-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-slate-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-955 dark:text-white uppercase tracking-wider">Granular Performance Metrics</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
                Track study time in minutes, logs, grade history logs, and unlock levels and milestones as you progress.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/30 flex flex-col justify-between h-56 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="space-y-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-slate-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800 flex items-center justify-center">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-955 dark:text-white uppercase tracking-wider">Dynamic Community Q&A</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
                Join discussions inside each lesson module, post comments, tag classmates, and directly message the instructor.
              </p>
            </div>
          </Card>

          <Card className="p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/30 flex flex-col justify-between h-56 transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <div className="space-y-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-slate-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-slate-800 flex items-center justify-center">
                <Play className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-955 dark:text-white uppercase tracking-wider">Immersive Video Player</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-light">
                Stream lecture series, download slides or files, and auto-save personal notes synced to video timestamps.
              </p>
            </div>
          </Card>

        </div>
      </div>
      
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Authentication Routes Layout (auth-specific header/styling) */}
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route path="verify-email" element={<EmailVerifyPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />

          {/* Main Layout Pages (shares global header with logout button) */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="courses" element={<CourseCatalogPage />} />
            <Route path="courses/:slug" element={<CourseDetailsPage />} />
            
            {/* Instructor dashboard & wizard */}
            <Route 
              path="instructor/courses" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                  <InstructorDashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="instructor/courses/create" 
              element={
                <ProtectedRoute allowedRoles={['INSTRUCTOR']}>
                  <CreateEditCoursePage />
                </ProtectedRoute>
              } 
            />

            {/* Student dashboard & learning player workspace */}
            <Route 
              path="dashboard" 
              element={
                <ProtectedRoute>
                  <StudentDashboardPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="courses/:slug/learn" 
              element={
                <ProtectedRoute>
                  <LearningPlayerPage />
                </ProtectedRoute>
              } 
            />
            <Route path="certificates/verify/:id" element={<CertificateVerifyPage />} />
            <Route 
              path="checkout/:courseId" 
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="admin-console" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminConsolePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="settings" 
              element={
                <ProtectedRoute>
                  <AccountSettingsPage />
                </ProtectedRoute>
              } 
            />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      
      <ToastContainer />
      <Confetti />
      <CookieConsentBanner />
    </QueryClientProvider>
  );
};

export default App;
