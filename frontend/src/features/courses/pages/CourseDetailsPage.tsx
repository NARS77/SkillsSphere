import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { type Course } from '../types';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toast } from '../../../store/toastStore';
import { 
  CheckCircle, 
  HelpCircle, 
  Clock, 
  Globe, 
  BookOpen, 
  ArrowLeft, 
  Edit3, 
  Star,
  Users
} from 'lucide-react';
import { CourseReviews } from '../components/CourseReviews';

export const CourseDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'about' | 'curriculum' | 'instructor' | 'reviews'>('about');

  const queryClient = useQueryClient();

  // Fetch course details by slug using React Query, only when slug is defined
  const { data: course, isLoading, error } = useQuery<Course>({
    queryKey: ['course-detail', slug],
    queryFn: async () => {
      const response = await api.get(`catalog/${slug}/`);
      return response.data;
    },
    enabled: !!slug, // skip query until slug is available
    retry: false,
  });

  const { data: wishlist = [], refetch: refetchWishlist } = useQuery({
    queryKey: ['my-wishlist'],
    queryFn: async () => {
      const res = await api.get('wishlist/');
      return res.data.results || res.data;
    },
    enabled: isAuthenticated
  });

  const isWishlisted = wishlist.some((item: any) => item.course === course?.id);

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        toast.error("Please login to manage your wishlist.");
        return;
      }
      const res = await api.post('wishlist/toggle/', { course_id: course?.id });
      return res.data;
    },
    onSuccess: () => {
      refetchWishlist();
      toast.success(isWishlisted ? 'Removed from wishlist.' : 'Added to wishlist!');
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!course?.id) throw new Error('Course not found');
      const response = await api.post(`enrollments/${course.id}/enroll/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-detail', slug] });
      if (course?.title) {
        toast.success(`Successfully enrolled in ${course.title}!`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to enroll in this course.');
    }
  });

  // If slug is missing, render nothing (should not happen)
  if (!slug) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 animate-pulse">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-80 w-full" />
          </div>
          <div className="w-full lg:w-96">
            <Skeleton className="h-[450px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Course Not Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-light leading-normal">
            The course you are looking for may have been deleted, archived, or is a draft you don't have access to.
          </p>
        </div>
        <Link to="/courses">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const isOwner = user && course?.instructor?.id === user.id;

  const handleEnroll = () => {
    if (!isAuthenticated) {
      toast.info('Please sign in to enroll in this course');
      navigate('/login');
      return;
    }
    enrollMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Draft Notification Banner for Owner */}
      {isOwner && course.status !== 'PUBLISHED' && (
        <div className="bg-indigo-50/50 border-b border-indigo-100/30 text-indigo-750 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400 py-3 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <span>This course is currently a **{course.status.toLowerCase()}** draft. Only you can preview it.</span>
          <Link to={`/instructor/courses/create?edit=${course.id}`}>
            <Button size="sm" variant="outline" className="py-1 px-3 text-[10px] h-6 flex items-center gap-1 border-indigo-300">
              <Edit3 className="h-3 w-3" />
              Edit Draft
            </Button>
          </Link>
        </div>
      )}

      {/* Hero Banner Header */}
      <div className="bg-slate-950 text-white py-12 md:py-16 relative overflow-hidden border-b border-slate-900">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:20px_20px]" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row gap-10 items-start justify-between">
            {/* Left Content */}
            <div className="flex-1 space-y-5 max-w-3xl">
              <Link to="/courses" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Catalog
              </Link>

              {course.category && (
                <span className="inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                  {course.category.name}
                </span>
              )}

              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white tracking-tight">
                {course.title}
              </h1>

              <p className="text-slate-350 text-xs sm:text-sm leading-relaxed font-light">
                {course.short_description}
              </p>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-bold text-white text-xs">{course?.rating ? course.rating.toFixed(1) : '0.0'}</span>
                  <span className="text-slate-500 font-light">(4 reviews)</span>
                </div>

                <div className="flex items-center gap-1.5 font-light">
                  <Users className="h-4 w-4" />
                  <span>{course.students_count} enrolled students</span>
                </div>

                <div className="flex items-center gap-1.5 font-light">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration} hours duration</span>
                </div>

                <div className="flex items-center gap-1.5 font-light">
                  <Globe className="h-4 w-4" />
                  <span>{course.language}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-light">
                Created by <span className="font-semibold text-white">{course.instructor.first_name && course.instructor.last_name ? `${course.instructor.first_name} ${course.instructor.last_name}` : course.instructor.username}</span> • Last updated {new Date(course.updated_at).toLocaleDateString()}
              </p>
            </div>

            {/* Empty spacer / visual alignment for overlay card */}
            <div className="hidden lg:block lg:w-96 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Main Body Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Left Column - Detailed Tabs */}
          <div className="flex-grow space-y-10 w-full lg:max-w-3xl order-2 lg:order-1">
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-200 dark:border-slate-800/40 gap-6 text-xs font-bold text-slate-400 pb-px">
              {(['about', 'curriculum', 'instructor', 'reviews'] as const).map((tab) => {
                const labels = { about: 'About', curriculum: 'Curriculum', instructor: 'Instructor', reviews: 'Reviews' };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      pb-4 border-b-2 transition-all duration-150 relative -bottom-[2px] cursor-pointer
                      ${activeTab === tab
                        ? 'border-indigo-650 text-indigo-700 dark:text-indigo-400 font-bold'
                        : 'border-transparent hover:text-slate-900 dark:hover:text-white'
                      }
                    `}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="space-y-8 animate-fade-in">
              {activeTab === 'about' && (
                <div className="space-y-8">
                  {/* Learning Outcomes */}
                  {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                    <Card className="border-slate-200/50 dark:border-slate-800/40 p-6 bg-white dark:bg-slate-900/50">
                      <h3 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider mb-4">
                        What you'll learn in this course
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-light">
                        {course.learning_outcomes.map((outcome, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span>{outcome}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Course Details (Description) */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">
                      Course Description
                    </h3>
                    <div className="prose prose-slate dark:prose-invert max-w-none text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-wrap font-light">
                      {course.description}
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-950 dark:text-white uppercase tracking-wider">
                        Requirements
                      </h3>
                      <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 space-y-1 font-light">
                        {course.prerequisites.map((prereq, idx) => (
                          <li key={idx}>{prereq}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="space-y-4 py-6 text-center">
                  <BookOpen className="h-10 w-10 text-slate-350 dark:text-slate-700 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Curriculum is Locked</h3>
                  <p className="text-xs text-slate-450 max-w-sm mx-auto font-light leading-normal">
                    Enroll in this course or complete your registration to unlock the video lessons, study resources, and quizzes.
                  </p>
                  <Button size="sm" onClick={handleEnroll} className="mt-2">Enroll Now</Button>
                </div>
              )}

              {activeTab === 'instructor' && (
                <div className="flex gap-6 items-start">
                  {course.instructor.avatar ? (
                    <img
                      src={course.instructor.avatar}
                      alt={course.instructor.username}
                      className="h-14 w-14 rounded-md object-cover border border-slate-200 dark:border-slate-800"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-650 dark:text-slate-350 font-bold border border-slate-200 dark:border-slate-800">
                      {course.instructor.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-2 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {course.instructor.first_name && course.instructor.last_name 
                        ? `${course.instructor.first_name} ${course.instructor.last_name}` 
                        : course.instructor.username
                      }
                    </h3>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      {course.instructor.headline || 'Instructor at SkillSphere'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                      This instructor manages active learning templates and creates professional materials on SkillSphere. Dedicated to helping students build portfolio-ready full stack apps.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <CourseReviews 
                  courseId={course.id}
                  rating={course.rating || 5.0}
                  reviewsCount={course.reviews_count || 0}
                  ratingDistribution={course.rating_distribution || {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}}
                  isEnrolled={!!course.is_enrolled}
                  instructorId={course.instructor.id}
                  progressPercent={course.progress_percent || 0}
                />
              )}
            </div>
          </div>

          {/* Right Column - Floating Enrollment Widget Card */}
          <div className="w-full lg:w-96 flex-shrink-0 lg:sticky lg:top-24 z-10 lg:-mt-36 order-1 lg:order-2">
            <Card className="border-slate-200/60 dark:border-slate-800/40 p-6 shadow-md relative overflow-hidden bg-white dark:bg-slate-900/50">
              <div className="space-y-6">
                {/* Course Thumbnail inside card */}
                {course.thumbnail && (
                  <div className="rounded-lg overflow-hidden aspect-video border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
                    <img src={course.thumbnail} alt={course.title} className="object-cover h-full w-full" />
                  </div>
                )}

                {/* Price Display */}
                <div className="flex items-baseline gap-2.5">
                  {course.discount_price ? (
                    <>
                      <span className="text-2xl font-bold text-slate-950 dark:text-white">
                        ${parseFloat(course.discount_price).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ${parseFloat(course.price).toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-slate-950 dark:text-white">{parseFloat(course?.price ?? 0) === 0 ? 'Free' : `$${parseFloat(course?.price ?? 0).toFixed(2)}`}</span>
                  )}
                </div>

                {/* Enroll buttons */}
                <div className="flex flex-col gap-2">
                  {course.is_enrolled ? (
                    <Link to={`/courses/${course.slug}/learn`} className="w-full">
                      <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500">
                        Go to Classroom
                      </Button>
                    </Link>
                  ) : parseFloat(course.price) === 0 ? (
                    <Button 
                      size="lg" 
                      className="w-full" 
                      onClick={handleEnroll}
                      isLoading={enrollMutation.isPending}
                    >
                      Enroll in Course (Free)
                    </Button>
                  ) : (
                    <Link to={`/checkout/${course.id}`} className="w-full">
                      <Button size="lg" className="w-full text-white">
                        Buy Now
                      </Button>
                    </Link>
                  )}
                  <Button 
                    size="lg" 
                    variant={isWishlisted ? "primary" : "outline"} 
                    className="w-full"
                    onClick={() => toggleWishlistMutation.mutate()}
                    isLoading={toggleWishlistMutation.isPending}
                  >
                    {isWishlisted ? 'Wishlisted' : 'Add to Wishlist'}
                  </Button>
                </div>

                {/* Specifications List */}
                <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/40 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider">This course includes:</h4>
                  <div className="space-y-2.5 text-slate-500 dark:text-slate-400 font-light">
                    <div className="flex items-center justify-between">
                      <span>Lectures</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-250">{course?.lessons_count ?? 0} Lessons (curriculum locked)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Difficulty Level</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-250 capitalize">{course?.difficulty?.toLowerCase() ?? 'unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated Duration</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-250">{course?.duration ?? '0'} hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Certificate</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-250">{course?.certificate ? 'Yes, Verifiable' : 'No'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Access</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-250">Lifetime access</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
