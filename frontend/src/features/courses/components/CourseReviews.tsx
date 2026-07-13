import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { Star, Pin, AlertTriangle, ThumbsUp, Trash2, Reply, Lock } from 'lucide-react';

interface CourseReviewsProps {
  courseId: string;
  rating: number;
  reviewsCount: number;
  ratingDistribution: Record<number, number>;
  isEnrolled: boolean;
  instructorId: string;
  progressPercent: number;
}

export const CourseReviews: React.FC<CourseReviewsProps> = ({ 
  courseId, rating, reviewsCount, ratingDistribution, isEnrolled, instructorId, progressPercent 
}) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);

  // 1. Fetch Reviews list
  const { data: reviews = [], refetch } = useQuery<any[]>({
    queryKey: ['course-reviews', courseId],
    queryFn: async () => {
      const res = await api.get(`reviews/?course=${courseId}`);
      return res.data.results || res.data;
    }
  });

  const myReview = reviews.find((r) => r.student_name === user?.username);

  // 2. Submit/Edit Review Mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      await api.post('reviews/', {
        course: courseId,
        rating: reviewRating,
        content: reviewContent
      });
    },
    onSuccess: () => {
      toast.success(myReview ? 'Review updated!' : 'Review submitted successfully!');
      setReviewContent('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['course-details'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to submit review.';
      toast.error(msg);
    }
  });

  // 3. Delete Review Mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.delete(`reviews/${reviewId}/`);
    },
    onSuccess: () => {
      toast.success('Review deleted.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['course-details'] });
    },
    onError: () => {
      toast.error('Failed to delete review.');
    }
  });

  // 4. Helpful Vote Mutation
  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.post(`reviews/${reviewId}/helpful/`);
    },
    onSuccess: () => {
      refetch();
    }
  });

  // 5. Report Review Mutation
  const reportMutation = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      await api.post(`reviews/${reviewId}/report/`, { reason });
    },
    onSuccess: () => {
      toast.success('Review reported for moderation.');
      refetch();
    }
  });

  // 6. Reply to Review Mutation
  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, content }: { reviewId: string; content: string }) => {
      await api.post(`reviews/${reviewId}/reply/`, { content });
    },
    onSuccess: () => {
      toast.success('Reply submitted.');
      setActiveReplyBox(null);
      refetch();
    },
    onError: () => {
      toast.error('Failed to reply.');
    }
  });

  // 7. Pin/Unpin Review Mutation
  const pinMutation = useMutation({
    mutationFn: async ({ reviewId, pin }: { reviewId: string; pin: boolean }) => {
      await api.post(`reviews/${reviewId}/pin/`, { pin });
    },
    onSuccess: () => {
      toast.success('Pin status updated.');
      refetch();
    }
  });

  // 8. Admin Moderation Hides
  const adminHideMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await api.post(`reviews/${reviewId}/hide/`);
    },
    onSuccess: () => {
      toast.success('Review hidden (Admin action).');
      refetch();
    }
  });

  const isInstructor = user?.id === instructorId;
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-8">
      {/* 1. Header with ratings breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="text-center md:text-left space-y-2">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white">
            {rating ? rating.toFixed(1) : '0.0'}
          </h3>
          <div className="flex justify-center md:justify-start text-amber-400 gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={`h-4.5 w-4.5 ${s <= Math.round(rating) ? 'fill-current text-amber-400' : 'text-slate-200 dark:text-slate-800'}`} 
              />
            ))}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {reviewsCount} Course Reviews
          </p>
        </div>

        {/* Distribution bars */}
        <div className="md:col-span-2 space-y-1.5 text-xs text-slate-500">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars] || 0;
            const percentage = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-12 text-right font-semibold">{stars} stars</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="w-8 text-slate-400 font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Review Form (Only show to enrolled students) */}
      {isEnrolled && isAuthenticated && !isInstructor && (
        progressPercent >= 30 ? (
          <Card className="p-5 border-dashed space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {myReview ? 'Edit Your Review' : 'Write a Review'}
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Your Rating:</span>
                <div className="flex text-amber-400 cursor-pointer gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      onClick={() => setReviewRating(s)}
                      className={`h-5 w-5 ${s <= reviewRating ? 'fill-current' : 'text-slate-200 dark:text-slate-800'}`} 
                    />
                  ))}
                </div>
              </div>
              <textarea
                placeholder="What did you think of the course? Share your experience..."
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                className="w-full text-xs rounded-xl border p-3 bg-white dark:bg-slate-950 focus:outline-none h-20"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => submitReviewMutation.mutate()}
                  isLoading={submitReviewMutation.isPending}
                >
                  Submit Review
                </Button>
                {myReview && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteReviewMutation.mutate(myReview.id)}
                    isLoading={deleteReviewMutation.isPending}
                  >
                    Delete Review
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5 border-dashed border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50 dark:bg-slate-900/10 text-center py-6">
            <Lock className="h-6 w-6 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">
              Review Submission Locked
            </h4>
            <p className="text-[10px] text-slate-500 max-w-sm mx-auto leading-relaxed font-light">
              You must complete at least 30% of the course material to unlock written feedback and rating options. 
              (Your current progress: <span className="font-bold text-slate-800 dark:text-white">{progressPercent}%</span>)
            </p>
          </Card>
        )
      )}

      {/* 3. Review Lists */}
      <div className="space-y-5 border-t pt-6">
        {reviews.map((r: any) => (
          <div key={r.id} className="text-xs space-y-3 bg-slate-50/50 dark:bg-slate-900/10 p-4 border rounded-2xl relative">
            {r.is_pinned && (
              <div className="absolute right-4 top-4 flex items-center gap-1 text-[9px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/20 px-2 py-0.5 rounded-full">
                <Pin className="h-3 w-3 fill-current" />
                Pinned Featured Review
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">{r.student_name}</span>
                <div className="flex text-amber-400 gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className={`h-3 w-3 ${s <= r.rating ? 'fill-current' : 'text-slate-200 dark:text-slate-800'}`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="text-slate-650 dark:text-slate-350 leading-relaxed font-light">
              {r.content || <em>No written feedback.</em>}
            </p>

            {/* Helpful & Moderation controls */}
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <button 
                onClick={() => helpfulMutation.mutate(r.id)} 
                className="flex items-center gap-1 hover:text-slate-900 font-semibold"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>Helpful ({r.helpful_count})</span>
              </button>
              
              <button 
                onClick={() => {
                  const reason = prompt('Reason for reporting review:');
                  if (reason) reportMutation.mutate({ reviewId: r.id, reason });
                }} 
                className="flex items-center gap-1 hover:text-rose-600"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Report</span>
              </button>

              {/* Pin Review (Instructor only) */}
              {isInstructor && (
                <button 
                  onClick={() => pinMutation.mutate({ reviewId: r.id, pin: !r.is_pinned })} 
                  className="flex items-center gap-1 hover:text-brand-600 font-bold text-[9px] uppercase"
                >
                  <Pin className="h-3 w-3" />
                  <span>{r.is_pinned ? 'Unpin' : 'Pin'}</span>
                </button>
              )}

              {/* Instructor Reply Toggle */}
              {isInstructor && !r.reply && (
                <button 
                  onClick={() => setActiveReplyBox(activeReplyBox === r.id ? null : r.id)} 
                  className="flex items-center gap-1 hover:text-brand-600 font-bold text-[9px] uppercase"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
                </button>
              )}

              {/* Admin Hide (Admin only) */}
              {isAdmin && (
                <button 
                  onClick={() => adminHideMutation.mutate(r.id)} 
                  className="flex items-center gap-1 hover:text-rose-600 font-bold text-[9px] uppercase"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Hide Review</span>
                </button>
              )}
            </div>

            {/* Render Reply Form */}
            {activeReplyBox === r.id && (
              <div className="space-y-2 mt-3 pt-3 border-t border-slate-200/50">
                <Input
                  placeholder="Type your response to this student..."
                  value={replyText[r.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [r.id]: e.target.value })}
                  className="text-xs"
                />
                <Button 
                  size="sm"
                  onClick={() => replyMutation.mutate({ reviewId: r.id, content: replyText[r.id] })}
                  isLoading={replyMutation.isPending}
                >
                  Post Reply
                </Button>
              </div>
            )}

            {/* Render Instructor Reply */}
            {r.reply && (
              <div className="bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl border mt-3 border-l-brand-500 border-l-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">
                    Response from Instructor ({r.reply.instructor_name})
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(r.reply.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-650 dark:text-slate-400 font-light leading-relaxed">
                  {r.reply.content}
                </p>
              </div>
            )}
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-8 text-slate-400 leading-relaxed font-light">
            No reviews left for this course yet. Be the first to share your learning experience!
          </div>
        )}
      </div>
    </div>
  );
};
