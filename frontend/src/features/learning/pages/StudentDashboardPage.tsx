import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import { StudyPlanner } from '../components/StudyPlanner';
import { 
  GraduationCap, 
  Play, 
  BookOpen, 
  Clock, 
  Trophy, 
  Flame,
  ArrowRight,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  FileText,
  FileArchive,
  Code,
  CheckCircle,
  HelpCircle,
  Award,
  Shield,
  Activity,
  Bookmark
} from 'lucide-react';

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  price: string;
  discount_price: string | null;
  thumbnail: string | null;
  instructor_name: string;
  category: {
    id: string;
    name: string;
  } | null;
}

interface ContinueCourse {
  course_id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  progress_percent: number;
  last_lesson_title: string;
  last_watched_at: string;
}

interface LearningStats {
  hours_watched: number;
  lessons_completed: number;
  courses_completed: number;
  avg_daily_learning: number;
  weekly_activity: Array<{ day: string; minutes: number }>;
}

interface EnrollmentHistoryItem {
  id: string;
  course: EnrolledCourse;
  is_active: boolean;
  completed_at: string | null;
  unregistered_at: string | null;
  created_at: string;
}

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'resources' | 'history' | 'grades' | 'certificates' | 'achievements' | 'wishlist' | 'planner'>('dashboard');

  // Fetch wishlist
  const { data: wishlist = [] } = useQuery<any[]>({
    queryKey: ['my-wishlist'],
    queryFn: async () => {
      const response = await api.get('wishlist/');
      return response.data.results || response.data;
    }
  });

  // Fetch enrolled courses
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<EnrolledCourse[]>({
    queryKey: ['my-enrolled-courses'],
    queryFn: async () => {
      const response = await api.get('enrollments/my-courses/');
      return response.data;
    }
  });

  // Fetch continue learning active queue
  const { data: continueList = [] } = useQuery<ContinueCourse[]>({
    queryKey: ['continue-learning-queue'],
    queryFn: async () => {
      const response = await api.get('learning/continue/');
      return response.data;
    }
  });

  // Fetch learning stats
  const { data: stats } = useQuery<LearningStats>({
    queryKey: ['learning-dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('learning/stats/');
      return response.data;
    }
  });

  // Fetch enrollment history
  const { data: historyItems = [] } = useQuery<EnrollmentHistoryItem[]>({
    queryKey: ['enrollment-history'],
    queryFn: async () => {
      const response = await api.get('enrollments/my-history/');
      return response.data;
    }
  });

  // Fetch all resources across enrolled courses
  const { data: resources = [], isLoading: isLoadingResources } = useQuery<Array<{ id: string; courseTitle: string; title: string; file: string; lessonTitle: string }>>({
    queryKey: ['my-resource-library', courses],
    enabled: courses.length > 0,
    queryFn: async () => {
      const allResources: any[] = [];
      for (const course of courses) {
        try {
          const res = await api.get(`learning/classroom/${course.slug}/`);
          const sections = res.data.sections || [];
          for (const sec of sections) {
            for (const les of sec.lessons || []) {
              for (const r of les.resources || []) {
                allResources.push({
                  id: r.id,
                  courseTitle: course.title,
                  lessonTitle: les.title,
                  title: r.title,
                  file: r.file
                });
              }
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
      return allResources;
    }
  });

  // Fetch grades
  const { data: gradesList = [] } = useQuery<any[]>({
    queryKey: ['my-grades-list'],
    queryFn: async () => {
      const response = await api.get('gradebook-entries/');
      return response.data.results || response.data;
    }
  });

  // Fetch certificates
  const { data: certificatesList = [] } = useQuery<any[]>({
    queryKey: ['my-certificates-list'],
    queryFn: async () => {
      const response = await api.get('certificates/');
      return response.data.results || response.data;
    }
  });

  // Fetch achievements
  const { data: achievementStats } = useQuery<any>({
    queryKey: ['my-achievement-stats'],
    queryFn: async () => {
      const response = await api.get('user-achievements/my-stats/');
      return response.data;
    }
  });

  const totalCourses = courses.length;
  const lessonsCompleted = stats?.lessons_completed ?? 0;
  const watchHours = stats?.hours_watched ?? 0.0;
  const coursesCompleted = stats?.courses_completed ?? 0;

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'zip' || ext === 'rar') return <FileArchive className="h-4.5 w-4.5 text-amber-500" />;
    if (ext === 'pdf') return <FileText className="h-4.5 w-4.5 text-rose-500" />;
    if (['js', 'ts', 'tsx', 'py', 'java', 'html', 'css'].includes(ext || '')) return <Code className="h-4.5 w-4.5 text-indigo-500" />;
    return <Layers className="h-4.5 w-4.5 text-slate-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Banner Dashboard Intro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-650 text-white p-8 rounded-xl relative overflow-hidden border border-indigo-750/30">
        <div className="space-y-1 relative z-10">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">
            Welcome back, {user?.first_name || user?.username || 'Learner'}!
          </h1>
          <p className="text-white/85 text-xs max-w-md font-light leading-normal">
            Resume your lessons, track your weekly analytics, and download source code resources.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <Button variant="secondary" onClick={() => navigate('/courses')} className="bg-white text-indigo-650 hover:bg-slate-50 border-0 font-bold shadow-sm">
            Browse More Courses
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 -z-0" />
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800/40 pb-2 overflow-x-auto select-none no-scrollbar">
        {(['dashboard', 'wishlist', 'resources', 'history', 'grades', 'certificates', 'achievements', 'planner'] as const).map((tab) => {
          const labels = {
            dashboard: 'My Dashboard',
            wishlist: `My Wishlist (${wishlist.length})`,
            resources: `Resource Library (${resources.length})`,
            history: 'Enrollment History',
            grades: 'My Grades',
            certificates: 'My Certificates',
            achievements: 'Achievements & XP',
            planner: 'AI Study Planner'
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Stats Counter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50">
              <div className="h-10 w-10 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 flex items-center justify-center border border-indigo-100/30">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Enrolled Courses</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-white"><AnimatedCounter value={totalCourses} /></span>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50">
              <div className="h-10 w-10 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center border border-emerald-100/30">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Completed Lessons</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-white"><AnimatedCounter value={lessonsCompleted} /></span>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50">
              <div className="h-10 w-10 rounded-lg bg-amber-50/50 dark:bg-amber-955/20 text-amber-600 flex items-center justify-center border border-amber-100/30">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Watch Time</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-white"><AnimatedCounter value={watchHours} suffix=" hrs" /></span>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50">
              <div className="h-10 w-10 rounded-lg bg-rose-50/50 dark:bg-rose-955/20 text-rose-600 flex items-center justify-center border border-rose-100/30">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Completed Courses</span>
                <span className="text-base font-extrabold text-slate-800 dark:text-white"><AnimatedCounter value={coursesCompleted} /></span>
              </div>
            </Card>
          </div>

          {/* Weekly activity section & Average learning */}
          {stats && stats.weekly_activity && (
            <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Weekly Study Activity</h3>
                  <p className="text-[10px] text-slate-400">Track your daily watch time in minutes</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{stats.avg_daily_learning} mins</span>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">Avg Daily Study</p>
                </div>
              </div>

              {/* Activity Chart Bars */}
              <div className="flex justify-between items-end h-28 pt-4 gap-2 border-b border-slate-100 dark:border-slate-850/40">
                {stats.weekly_activity.map((dayData, idx) => {
                  const maxMins = Math.max(...stats.weekly_activity.map(d => d.minutes), 10);
                  const barHeightPercent = (dayData.minutes / maxMins) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="text-[8px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {dayData.minutes}m
                      </div>
                      <div 
                        className="w-full bg-indigo-500/10 dark:bg-indigo-500/5 rounded-t-md hover:bg-indigo-600 transition-all duration-150 relative overflow-hidden" 
                        style={{ height: `${Math.max(barHeightPercent, 4)}%` }}
                      >
                        <div className="absolute inset-0 bg-indigo-600 opacity-80" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{dayData.day}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Continue watched active Course Block */}
          {continueList.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Continue Learning
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {continueList.map((item) => (
                  <Card key={item.course_id} className="p-5 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center min-w-0 flex-1">
                      {item.thumbnail ? (
                        <img 
                          src={item.thumbnail} 
                          alt={item.title} 
                          className="h-12 w-18 rounded-md object-cover shrink-0 border border-slate-100 dark:border-slate-850"
                        />
                      ) : (
                        <div className="h-12 w-18 rounded-md bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0 border dark:border-slate-850">
                          <GraduationCap className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-bold text-slate-850 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate font-light">
                          Up next: {item.last_lesson_title}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${item.progress_percent}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 shrink-0">
                            {item.progress_percent}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link to={`/courses/${item.slug}/learn`}>
                      <Button size="sm" className="px-3 shrink-0">
                        <Play className="h-3 w-3 mr-1 fill-current" />
                        Resume
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Grid of All Enrolled Courses */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider">
              My Enrolled Courses
            </h2>

            {isLoadingCourses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="h-64 bg-slate-200 dark:bg-slate-850 rounded-xl animate-pulse" />
                <div className="h-64 bg-slate-200 dark:bg-slate-850 rounded-xl animate-pulse" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 max-w-md mx-auto p-6 space-y-4">
                <GraduationCap className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">No active enrollments</h3>
                <p className="text-xs text-slate-400 font-light leading-normal">
                  You haven't enrolled in any courses yet. Browse our library to find a course and start learning!
                </p>
                <Button onClick={() => navigate('/courses')}>Explore Courses</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="overflow-hidden p-0 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/50 flex flex-col justify-between">
                    <div>
                      {course.thumbnail ? (
                        <img 
                          src={course.thumbnail} 
                          alt={course.title} 
                          className="w-full h-32 object-cover border-b border-slate-100 dark:border-slate-850"
                        />
                      ) : (
                        <div className="w-full h-32 bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-white border-b border-slate-100 dark:border-slate-850">
                          <GraduationCap className="h-8 w-8 text-slate-450 opacity-70" />
                        </div>
                      )}

                      <div className="p-5 space-y-2">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-slate-700/50">
                          {course.category?.name || 'Development'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 tracking-tight">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-2 leading-relaxed font-light">
                          {course.short_description}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-850/40 flex justify-between items-center text-xs font-medium">
                      <span className="text-[10px] text-slate-400 font-light">Instructor: {course.instructor_name}</span>
                      <Link to={`/courses/${course.slug}/learn`}>
                        <Button size="sm" className="font-bold">
                          Open Classroom
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'resources' && (
        <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Global Resource Library</h3>
            <p className="text-[10px] text-slate-400">Download files, slides, source codes, and assets from all your enrolled courses.</p>
          </div>

          {isLoadingResources ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400 space-y-2">
              <HelpCircle className="h-10 w-10 mx-auto text-slate-350 dark:text-slate-700" />
              <p>No downloadable resources found in your courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources.map((res) => (
                <div key={res.id} className="p-4 border border-slate-200/60 dark:border-slate-800 rounded-xl hover:border-slate-350 bg-slate-50/20 dark:bg-slate-950/20 flex items-center justify-between gap-3 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(res.file)}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate" title={res.title}>
                        {res.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate font-light">
                        Course: {res.courseTitle}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate font-light">
                        Lesson: {res.lessonTitle}
                      </p>
                    </div>
                  </div>
                  <a href={res.file} target="_blank" rel="noopener noreferrer" download className="shrink-0">
                    <Button size="sm" variant="outline" className="p-2">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'wishlist' && (
        <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">My Wishlist</h3>
            <p className="text-[10px] text-slate-400">Courses you have wishlisted or bookmarked before enrollment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {wishlist.map((item: any) => {
              const c = item.course_details;
              if (!c) return null;
              return (
                <div key={item.id} className="border border-slate-200/60 dark:border-slate-850/55 rounded-xl overflow-hidden flex flex-col justify-between bg-white dark:bg-slate-900/50">
                  {c.thumbnail ? (
                    <img src={c.thumbnail} alt="" className="h-40 w-full object-cover border-b dark:border-slate-850" />
                  ) : (
                    <div className="h-40 w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-xs font-bold text-slate-400 border-b dark:border-slate-850">Course Thumbnail</div>
                  )}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{c.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-light">{c.short_description}</p>
                    </div>

                    <div className="flex justify-between items-baseline gap-2 pt-2 border-t border-slate-100 dark:border-slate-850/40 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">${parseFloat(c.price).toFixed(2)}</span>
                      <Link to={`/courses/${c.slug}`}>
                        <Button size="sm" variant="outline" className="text-[10px] py-1 px-3">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {wishlist.length === 0 && (
              <div className="col-span-3 text-center py-16 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-sm mx-auto w-full">
                <Bookmark className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-250">Your Wishlist is Empty</h3>
                <p className="text-xs text-slate-405 max-w-xs mx-auto font-light leading-normal">
                  Bookmark courses you are interested in while exploring the catalog to see them here!
                </p>
                <Button size="sm" onClick={() => navigate('/courses')}>Browse Catalog</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40 overflow-hidden">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enrollment Logs & History</h3>
            <p className="text-[10px] text-slate-400">View registration dates, completion stats, and unenrollment history.</p>
          </div>

          {historyItems.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 dark:bg-slate-900/10 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-sm mx-auto w-full">
              <Calendar className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-250">No History Found</h3>
              <p className="text-xs text-slate-405 max-w-xs mx-auto font-light leading-normal">
                Once you enroll in dynamic courses, your logs and learning timeline records will display here.
              </p>
              <Button size="sm" onClick={() => navigate('/courses')}>Explore Catalog</Button>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Course Name</th>
                    <th className="px-6 py-4">Enrollment Date</th>
                    <th className="px-6 py-4">Completion Date</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-white">{item.course?.title || 'Unknown Course'}</td>
                      <td className="px-6 py-4 text-slate-500 font-light">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-light">
                        {item.completed_at ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle className="h-3 w-3" />
                            {new Date(item.completed_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">In progress</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.is_active ? (
                          <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-100/30">Active</span>
                        ) : (
                          <div className="space-y-1">
                            <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 px-2 py-0.5 rounded text-[9px] font-bold border border-rose-100/30">Unenrolled</span>
                            {item.unregistered_at && (
                              <p className="text-[8px] text-slate-400">on {new Date(item.unregistered_at).toLocaleDateString()}</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'grades' && (
        <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40 overflow-hidden">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Grade Reports</h3>
            <p className="text-[10px] text-slate-400">Track your scores, final grade percentages, and completion achievements.</p>
          </div>

          {gradesList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-450 font-light">
              No academic grade records found yet. Complete quizzes and assignments in your courses to see grades here!
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[600px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Course Name</th>
                    <th className="px-6 py-4">Numerical Score</th>
                    <th className="px-6 py-4">Letter Grade</th>
                    <th className="px-6 py-4">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {gradesList.map((grade) => (
                    <tr key={grade.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-850 dark:text-white">{grade.course_title}</td>
                      <td className="px-6 py-4 font-bold text-slate-650 dark:text-slate-300">{grade.overall_score}%</td>
                      <td className="px-6 py-4 font-black text-indigo-600 dark:text-indigo-400 text-sm">{grade.grade_letter}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${grade.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 border border-emerald-100/30' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 border border-rose-100/30'}`}>
                          {grade.passed ? 'Passed & Certified' : 'Incomplete'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'certificates' && (
        <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Earned Certificates</h3>
            <p className="text-[10px] text-slate-400">Download officially verified landscape PDF certificates of completion.</p>
          </div>

          {certificatesList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-450 font-light">
              You haven't earned any certificates yet. Complete 100% of the lessons in a course to automatically issue your certificate!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificatesList.map((cert) => (
                <Card key={cert.id} className="p-0 border-slate-200/60 dark:border-slate-850/55 hover:border-slate-350 dark:hover:border-slate-700 transition-colors flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900/50">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <Award className="h-5 w-5" />
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 block">{cert.certificate_id}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-850 dark:text-white tracking-tight">{cert.course_title}</h4>
                      <p className="text-[9px] text-slate-405 font-light">Issued on {new Date(cert.issued_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 px-5 py-3 border-t border-slate-100 dark:border-slate-850 flex gap-2 justify-end">
                    <Link to={`/certificates/verify/${cert.certificate_id}`} className="shrink-0">
                      <Button size="sm" variant="outline" className="text-[10px] font-bold">
                        Verify View
                      </Button>
                    </Link>
                    {cert.pdf_file && (
                      <a href={cert.pdf_file} target="_blank" rel="noopener noreferrer" download className="shrink-0">
                        <Button size="sm" className="text-[10px] font-bold flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          Download PDF
                        </Button>
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {/* XP & Level Panel */}
          {achievementStats && (
            <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-slate-950 text-white rounded-xl flex flex-col items-center justify-center font-black border border-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <span className="text-[8px] uppercase tracking-wide opacity-80 font-bold">LVL</span>
                  <span className="text-lg leading-tight font-extrabold">{achievementStats.level}</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">XP Progression Tracker</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-2 bg-slate-250 dark:bg-slate-800 rounded-full overflow-hidden border">
                      <div className="h-full bg-indigo-500" style={{ width: `${achievementStats.xp % 100}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{achievementStats.xp} XP total</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 border-l border-slate-200 dark:border-slate-800 pl-6">
                <div className="text-center">
                  <span className="text-xs font-bold text-rose-500 flex items-center gap-1 justify-center">
                    <Flame className="h-4.5 w-4.5 fill-rose-500 text-rose-500" />
                    {achievementStats.streak} Days
                  </span>
                  <span className="text-[9px] uppercase text-slate-400 font-bold block mt-1">Learning Streak</span>
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-indigo-650 dark:text-indigo-400 flex items-center gap-1 justify-center">
                    <Activity className="h-4.5 w-4.5" />
                    Active
                  </span>
                  <span className="text-[9px] uppercase text-slate-400 font-bold block mt-1">Status</span>
                </div>
              </div>
            </Card>
          )}

          {/* Badges and milestones listings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unlocked Badges */}
            <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5 text-slate-800 dark:text-white">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Unlocked Achievements ({achievementStats?.unlocked?.length ?? 0})</h4>
              </div>

              {achievementStats?.unlocked?.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-light">
                  No unlocked achievements yet. Earn XP by completing tasks!
                </div>
              ) : (
                <div className="space-y-3">
                  {achievementStats?.unlocked?.map((ua: any) => (
                    <div key={ua.id} className="flex gap-3 items-center bg-slate-50/20 border border-slate-200 dark:border-slate-800/80 p-3 rounded-xl">
                      <div className="h-9 w-9 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md flex items-center justify-center font-bold border border-slate-200/60 dark:border-slate-800">
                        <Award className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-white block truncate">{ua.badge.name}</span>
                        <p className="text-[10px] text-slate-450 leading-normal truncate font-light">{ua.badge.description}</p>
                        <span className="text-[9px] text-emerald-600 font-semibold block">Unlocked on {new Date(ua.awarded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Locked Badges */}
            <Card className="p-6 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/40 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-1.5 text-slate-500">
                <Shield className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Locked Badges ({achievementStats?.locked?.length ?? 0})</h4>
              </div>

              {achievementStats?.locked?.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-light">
                  You unlocked all available badges! Absolute champion.
                </div>
              ) : (
                <div className="space-y-3">
                  {achievementStats?.locked?.map((badge: any) => (
                    <div key={badge.id} className="flex gap-3 items-center bg-slate-50/20 border border-slate-200/30 p-3 rounded-xl opacity-60">
                      <div className="h-9 w-9 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-md flex items-center justify-center font-bold border border-slate-250 dark:border-slate-800">
                        <Shield className="h-4.5 w-4.5" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block truncate">{badge.name}</span>
                        <p className="text-[10px] text-slate-400 leading-normal truncate font-light">{badge.description}</p>
                        <span className="text-[9px] text-slate-400 font-semibold block">Reward: {badge.xp_reward} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'planner' && (
        <StudyPlanner />
      )}
    </div>
  );
};

export default StudentDashboardPage;
