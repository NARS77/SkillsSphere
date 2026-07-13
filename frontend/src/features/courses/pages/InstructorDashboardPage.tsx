import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { type Course } from '../types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toast } from '../../../store/toastStore';
import { GradebookSpreadsheet } from '../components/GradebookSpreadsheet';
import { InstructorInbox } from '../components/InstructorInbox';
import { 
  Plus, 
  Users, 
  Star, 
  DollarSign, 
  Percent, 
  Edit, 
  Copy, 
  Trash2, 
  Globe, 
  Archive,
  BookOpen,
  X,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react';

interface StudentRosterItem {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  enrolled_at: string;
  completed_at: string | null;
  unregistered_at: string | null;
  is_active: boolean;
  progress_percent: number;
}

interface CourseAnalytics {
  active_learners: number;
  average_completion: number;
  most_watched_lesson: string;
  drop_off_lesson: string;
}

export const InstructorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'courses' | 'inbox'>('courses');
  const [activeRosterCourseId, setActiveRosterCourseId] = useState<string | null>(null);
  const [activeAnalyticsCourseId, setActiveAnalyticsCourseId] = useState<string | null>(null);
  const [activeGradebookCourseId, setActiveGradebookCourseId] = useState<string | null>(null);

  // Fetch instructor's owned courses
  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ['instructor-courses'],
    queryFn: async () => {
      const response = await api.get('instructor/courses/');
      return response.data.results || response.data;
    },
  });

  // Fetch instructor revenue stats
  const { data: revStats } = useQuery({
    queryKey: ['instructor-revenue-stats'],
    queryFn: async () => {
      const response = await api.get('payouts/instructor-revenue/');
      return response.data;
    }
  });

  // Query roster for the active course ID
  const { data: roster = [], isLoading: isLoadingRoster } = useQuery<StudentRosterItem[]>({
    queryKey: ['course-roster', activeRosterCourseId],
    enabled: !!activeRosterCourseId,
    queryFn: async () => {
      const response = await api.get(`instructor/courses/${activeRosterCourseId}/students/`);
      return response.data;
    }
  });

  // Query analytics for the active course ID
  const { data: analytics } = useQuery<CourseAnalytics>({
    queryKey: ['course-analytics-details', activeAnalyticsCourseId],
    enabled: !!activeAnalyticsCourseId,
    queryFn: async () => {
      const response = await api.get(`instructor/courses/${activeAnalyticsCourseId}/analytics/`);
      return response.data;
    }
  });

  const totalStudents = courses.reduce((acc, c) => acc + (c.students_count || 0), 0);
  const draftCoursesCount = courses.filter(c => c.status === 'DRAFT').length;
  const publishedCoursesCount = courses.filter(c => c.status === 'PUBLISHED').length;

  const duplicateMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.post(`instructor/courses/${courseId}/duplicate/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Course duplicated successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to duplicate course.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await api.delete(`instructor/courses/${courseId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Draft course deleted successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete course.');
    }
  });

  const publishMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.post(`instructor/courses/${courseId}/publish/`);
      return response.data;
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success(`"${course.title}" is now published!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to publish course.');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await api.post(`instructor/courses/${courseId}/archive/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      toast.success('Course archived successfully.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to archive course.');
    }
  });

  const getStatusBadge = (status: string) => {
    const configs = {
      DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border-slate-200/50 dark:border-slate-700/50',
      PUBLISHED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
      ARCHIVED: 'bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    };
    const key = status as keyof typeof configs;
    const style = configs[key] || configs.DRAFT;

    return (
      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${style}`}>
        {status}
      </span>
    );
  };

  const activeRosterCourseTitle = courses.find(c => c.id === activeRosterCourseId)?.title || '';
  const activeAnalyticsCourseTitle = courses.find(c => c.id === activeAnalyticsCourseId)?.title || '';
  const activeGradebookCourseTitle = courses.find(c => c.id === activeGradebookCourseId)?.title || '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Console for {user?.first_name || user?.username || 'Instructor'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-light mt-0.5">
            Create course curriculums and monitor student enrollments. • {publishedCoursesCount} Published / {draftCoursesCount} Drafts
          </p>
        </div>
        <Link to="/instructor/courses/create">
          <Button className="flex items-center gap-1 font-bold">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800/40 pb-2 select-none">
        <button
          onClick={() => {
            setActiveTab('courses');
            setActiveRosterCourseId(null);
            setActiveAnalyticsCourseId(null);
            setActiveGradebookCourseId(null);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'courses' 
              ? 'bg-indigo-650 text-white shadow-sm' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-905 dark:hover:text-slate-100'
          }`}
        >
          My Courses & Revenue
        </button>
        <button
          onClick={() => {
            setActiveTab('inbox');
            setActiveRosterCourseId(null);
            setActiveAnalyticsCourseId(null);
            setActiveGradebookCourseId(null);
          }}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'inbox' 
              ? 'bg-indigo-650 text-white shadow-sm' 
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50 hover:text-slate-905 dark:hover:text-slate-100'
          }`}
        >
          Student Messages (Inbox)
        </button>
      </div>

      {activeTab === 'courses' && (
        <>
          {/* Stats Cards Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-600 border border-indigo-100/30">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Students Enrolled</p>
                <h3 className="text-base font-extrabold text-slate-905 dark:text-white">{totalStudents}</h3>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-amber-50/50 dark:bg-amber-955/20 flex items-center justify-center text-amber-600 border border-amber-100/30">
                <Star className="h-5 w-5 fill-current" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Average Rating</p>
                <h3 className="text-base font-extrabold text-slate-905 dark:text-white">4.8</h3>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-emerald-50/50 dark:bg-emerald-955/20 flex items-center justify-center text-emerald-600 border border-emerald-100/30">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Sales</p>
                <h3 className="text-base font-extrabold text-slate-905 dark:text-white">
                  ${revStats?.total_earnings ? revStats.total_earnings.toFixed(2) : '0.00'}
                </h3>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/50">
              <div className="h-10 w-10 rounded-lg bg-rose-50/50 dark:bg-rose-955/20 flex items-center justify-center text-rose-600 border border-rose-100/30">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pending Payouts</p>
                <h3 className="text-base font-extrabold text-slate-905 dark:text-white">
                  ${revStats?.pending_payouts ? revStats.pending_payouts.toFixed(2) : '0.00'}
                </h3>
              </div>
            </Card>
          </div>

          {/* Courses List Container */}
          <Card className="border-slate-200/50 dark:border-slate-855/50 p-0 overflow-hidden bg-white dark:bg-slate-900/50">
            <div className="p-6 border-b border-slate-100 dark:border-slate-850/40">
              <h3 className="text-xs font-bold text-slate-905 dark:text-white uppercase tracking-wider">My Authored Courses ({courses.length})</h3>
            </div>

            {isLoading && (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-16 w-24 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="w-1/3" />
                      <Skeleton variant="text" className="w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && courses.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <BookOpen className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto" />
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">You haven't created any courses</h4>
                  <p className="text-xs text-slate-450 font-light leading-normal">Get started by launching our multi-step creation wizard to outline draft settings.</p>
                </div>
                <Link to="/instructor/courses/create">
                  <Button size="sm" className="mt-2">
                    Create First Course
                    <Plus className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            )}

            {!isLoading && courses.length > 0 && (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="px-6 py-4">Course Details</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4 text-right pr-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/45">
                      {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex gap-4 items-center">
                              <div className="h-10 w-16 rounded bg-slate-105 dark:bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-200/40 dark:border-slate-800/40">
                                {course.thumbnail ? (
                                  <img src={course.thumbnail} alt={course.title} className="object-cover h-full w-full" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-950 font-bold">
                                    LMS
                                  </div>
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 tracking-tight">{course.title}</h4>
                                <p className="text-slate-400 text-[10px] font-light">Last updated {new Date(course.updated_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">{getStatusBadge(course.status)}</td>

                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                            ${parseFloat(course.price).toFixed(2)}
                          </td>

                          <td className="px-6 py-4 text-slate-500 font-light">{course.duration} hours</td>

                          <td className="px-6 py-4 text-right pr-8">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/instructor/courses/create?edit=${course.id}`)}
                                className="p-2 text-slate-450 hover:text-indigo-650 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
                                title="Edit Course"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              {course.status === 'PUBLISHED' && (
                                <Link
                                  to={`/courses/${course.slug}`}
                                  className="p-2 text-slate-450 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
                                  title="Preview Course"
                                >
                                  <Globe className="h-4 w-4" />
                                </Link>
                              )}

                              {/* Roster Button */}
                              <button
                                onClick={() => setActiveRosterCourseId(course.id)}
                                className="p-2 text-slate-450 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
                                title="View Student Roster"
                              >
                                <Users className="h-4 w-4" />
                              </button>

                              {/* Analytics Button */}
                              <button
                                onClick={() => setActiveAnalyticsCourseId(course.id)}
                                className="p-2 text-slate-450 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
                                title="View Course Analytics"
                              >
                                <TrendingUp className="h-4 w-4" />
                              </button>

                              {/* Gradebook Button */}
                              <button
                                onClick={() => setActiveGradebookCourseId(course.id)}
                                className="p-2 text-slate-450 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
                                title="View Course Gradebook"
                              >
                                <Award className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => duplicateMutation.mutate(course.id)}
                                disabled={duplicateMutation.isPending}
                                className="p-2 text-slate-455 hover:text-indigo-655 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                                title="Duplicate Course"
                              >
                                <Copy className="h-4 w-4" />
                              </button>

                              {course.status === 'DRAFT' && (
                                <button
                                  onClick={() => publishMutation.mutate(course.id)}
                                  disabled={publishMutation.isPending}
                                  className="p-2 text-indigo-500 hover:text-indigo-655 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                                  title="Publish Course"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              )}

                              {course.status === 'PUBLISHED' && (
                                <button
                                  onClick={() => archiveMutation.mutate(course.id)}
                                  disabled={archiveMutation.isPending}
                                  className="p-2 text-slate-455 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                                  title="Archive Course"
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                              )}

                              {course.status === 'DRAFT' && (
                                <button
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to permanently delete this draft? This cannot be undone.")) {
                                      deleteMutation.mutate(course.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-md transition-colors disabled:opacity-40 cursor-pointer"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card Stack */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/40">
                  {courses.map((course) => (
                    <div key={course.id} className="p-4 space-y-4">
                      <div className="flex gap-4 items-center">
                        <div className="h-12 w-20 rounded bg-slate-105 dark:bg-slate-950 overflow-hidden flex-shrink-0 border dark:border-slate-850">
                          {course.thumbnail ? (
                            <img src={course.thumbnail} alt={course.title} className="object-cover h-full w-full" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-100 font-bold text-[10px]">
                              LMS
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">{course.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(course.status)}
                            <span className="text-[10px] text-slate-500 font-medium">${parseFloat(course.price).toFixed(2)}</span>
                            <span className="text-[10px] text-slate-500 font-medium">• {course.duration} hrs</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[10px]">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full py-2 text-[10px]"
                          onClick={() => navigate(`/instructor/courses/create?edit=${course.id}`)}
                        >
                          <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                        </Button>

                        {course.status === 'PUBLISHED' && (
                          <Link to={`/courses/${course.slug}`} className="w-full">
                            <Button size="sm" variant="outline" className="w-full py-2 text-[10px]">
                              <Globe className="h-3.5 w-3.5 mr-1" /> Preview
                            </Button>
                          </Link>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full py-2 text-[10px]"
                          onClick={() => setActiveRosterCourseId(course.id)}
                        >
                          <Users className="h-3.5 w-3.5 mr-1" /> Roster
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full py-2 text-[10px]"
                          onClick={() => setActiveAnalyticsCourseId(course.id)}
                        >
                          <TrendingUp className="h-3.5 w-3.5 mr-1" /> Analytics
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full py-2 text-[10px]"
                          onClick={() => setActiveGradebookCourseId(course.id)}
                        >
                          <Award className="h-3.5 w-3.5 mr-1" /> Gradebook
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full py-2 text-[10px]"
                          onClick={() => duplicateMutation.mutate(course.id)}
                          disabled={duplicateMutation.isPending}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                        </Button>

                        {course.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            className="w-full py-2 text-[10px]"
                            onClick={() => publishMutation.mutate(course.id)}
                            disabled={publishMutation.isPending}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Publish
                          </Button>
                        )}

                        {course.status === 'PUBLISHED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full py-2 text-[10px]"
                            onClick={() => archiveMutation.mutate(course.id)}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                          </Button>
                        )}

                        {course.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            variant="danger"
                            className="w-full py-2 text-[10px]"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to permanently delete this draft? This cannot be undone.")) {
                                deleteMutation.mutate(course.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Instructor Revenue & Payouts details */}
          {revStats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 space-y-4 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/50">
                <h3 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider">Earnings & Payout History</h3>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400">
                        <th className="py-2.5 font-bold">Month / Date</th>
                        <th className="py-2.5 font-bold">Daily Earnings</th>
                        <th className="py-2.5 font-bold">Sales Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/30">
                      {revStats.revenue_trends?.map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-500 font-light">
                          <td className="py-2.5 font-semibold text-slate-800 dark:text-white">{t.date}</td>
                          <td className="py-2.5 text-emerald-600 font-bold">${t.revenue.toFixed(2)}</td>
                          <td className="py-2.5">{t.sales_count} enrollments</td>
                        </tr>
                      ))}
                      {(!revStats.revenue_trends || revStats.revenue_trends.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400">No recent sales records.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-6 space-y-4 border-slate-200/50 dark:border-slate-850/50 bg-white dark:bg-slate-900/50">
                <h3 className="text-xs font-bold text-slate-955 dark:text-white uppercase tracking-wider">Top Courses By Sales</h3>
                <div className="space-y-3">
                  {revStats.best_selling_courses?.map((c: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20 p-3 border border-slate-200/40 dark:border-slate-800/40 rounded-xl text-xs">
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{c.course_title}</p>
                        <p className="text-[10px] text-slate-400 font-light mt-0.5">{c.sales_count} enrollments</p>
                      </div>
                      <span className="font-bold text-emerald-600 shrink-0">${c.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                  {(!revStats.best_selling_courses || revStats.best_selling_courses.length === 0) && (
                    <p className="text-slate-455 text-center py-8 text-xs font-light">No best sellers yet.</p>
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {activeTab === 'inbox' && (
        <InstructorInbox />
      )}

      {/* Roster Slide-out Panel */}
      {activeRosterCourseId && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-950 h-full p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-900 shadow-2xl flex flex-col justify-between transition-transform duration-200 ease-out">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/40">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white flex items-center gap-1.5 tracking-tight">
                    <Users className="h-5 w-5 text-indigo-500" />
                    Student Roster
                  </h3>
                  <p className="text-[10px] text-slate-400 font-light mt-0.5">Course: {activeRosterCourseTitle}</p>
                </div>
                <button onClick={() => setActiveRosterCourseId(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {isLoadingRoster ? (
                <div className="space-y-4 py-8">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : roster.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Users className="h-10 w-10 mx-auto text-slate-300" />
                  <p>No learners have enrolled in this course yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/50 dark:border-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Enrollment Date</th>
                        <th className="px-4 py-3">Progress</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                      {roster.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-500 font-light">
                          <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">
                            {student.first_name || student.last_name ? `${student.first_name} ${student.last_name}` : student.username}
                          </td>
                          <td className="px-4 py-3">{student.email}</td>
                          <td className="px-4 py-3">{new Date(student.enrolled_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">{student.progress_percent}%</td>
                          <td className="px-4 py-3">
                            {student.is_active ? (
                              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-emerald-100/30">Active</span>
                            ) : (
                              <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 px-1.5 py-0.5 rounded-md text-[9px] font-bold border border-rose-100/30">Unenrolled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/30 mt-6 flex justify-end">
              <Button onClick={() => setActiveRosterCourseId(null)} variant="outline">Close Roster</Button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Slide-out Panel */}
      {activeAnalyticsCourseId && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-900 shadow-2xl flex flex-col justify-between transition-transform duration-200 ease-out">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/40">
                <div>
                  <h3 className="text-base font-bold text-slate-955 dark:text-white flex items-center gap-1.5 tracking-tight">
                    <TrendingUp className="h-5 w-5 text-indigo-550" />
                    Course Performance Analytics
                  </h3>
                  <p className="text-[10px] text-slate-400 font-light mt-0.5">Course: {activeAnalyticsCourseTitle}</p>
                </div>
                <button onClick={() => setActiveAnalyticsCourseId(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 border-slate-200/50 bg-slate-50/30 dark:bg-slate-950/20">
                      <Users className="h-4.5 w-4.5 text-indigo-500 mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Active Learners</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{analytics.active_learners}</span>
                    </Card>

                    <Card className="p-4 border-slate-200/50 bg-slate-50/30 dark:bg-slate-950/20">
                      <Award className="h-4.5 w-4.5 text-emerald-500 mb-2" />
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Avg Completion</span>
                      <span className="text-base font-extrabold text-slate-900 dark:text-white">{analytics.average_completion}%</span>
                    </Card>
                  </div>

                  <Card className="p-4 border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-650">
                      <Star className="h-4 w-4 fill-current" />
                      Most Watched Lesson
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{analytics.most_watched_lesson}</p>
                    <p className="text-[10px] text-slate-400 font-light leading-normal">Lesson with the highest cumulative watch hours among enrolled students.</p>
                  </Card>

                  <Card className="p-4 border-slate-200/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                      <AlertCircle className="h-4 w-4" />
                      Drop-off Hotspot Lesson
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{analytics.drop_off_lesson}</p>
                    <p className="text-[10px] text-slate-400 font-light leading-normal">Lesson where students pause, abandon, or fail to complete lessons most frequently.</p>
                  </Card>
                </div>
              ) : (
                <div className="space-y-4 py-8">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/30 mt-6 flex justify-end">
              <Button onClick={() => setActiveAnalyticsCourseId(null)} variant="outline">Close Analytics</Button>
            </div>
          </div>
        </div>
      )}
      {/* Gradebook Slide-out Panel */}
      {activeGradebookCourseId && (
        <GradebookSpreadsheet
          courseId={activeGradebookCourseId}
          courseTitle={activeGradebookCourseTitle}
          onClose={() => setActiveGradebookCourseId(null)}
        />
      )}
    </div>
  );
};

export default InstructorDashboardPage;
