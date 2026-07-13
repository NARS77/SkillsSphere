import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { 
  MessageSquare, Plus, CheckCircle, ThumbsUp, 
  Pin, Lock, Search, ChevronLeft 
} from 'lucide-react';

interface DiscussionsTabProps {
  courseId: string;
  instructorId: string;
}

export const DiscussionsTab: React.FC<DiscussionsTabProps> = ({ courseId, instructorId }) => {
  const { user } = useAuthStore();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  // 1. Fetch Threads
  const { data: threads = [], refetch: refetchThreads } = useQuery<any[]>({
    queryKey: ['discussion-threads', courseId],
    queryFn: async () => {
      const res = await api.get(`threads/?course=${courseId}`);
      return res.data.results || res.data;
    }
  });

  // 2. Fetch Thread details (expanded replies)
  const { data: activeThread, refetch: refetchActiveThread } = useQuery<any>({
    queryKey: ['discussion-thread-detail', selectedThreadId],
    queryFn: async () => {
      const res = await api.get(`threads/${selectedThreadId}/`);
      return res.data;
    },
    enabled: !!selectedThreadId
  });

  // 3. Create Thread Mutation
  const createThreadMutation = useMutation({
    mutationFn: async () => {
      await api.post('threads/', {
        course: courseId,
        title: newTitle,
        content: newContent
      });
    },
    onSuccess: () => {
      toast.success('Discussion thread created!');
      setIsCreatingThread(false);
      setNewTitle('');
      setNewContent('');
      refetchThreads();
    }
  });

  // 4. Create Reply Mutation
  const createReplyMutation = useMutation({
    mutationFn: async () => {
      await api.post('replies/', {
        thread: selectedThreadId,
        content: replyContent
      });
    },
    onSuccess: () => {
      toast.success('Reply posted.');
      setReplyContent('');
      refetchActiveThread();
      refetchThreads();
    }
  });

  // 5. Vote Thread Mutation
  const voteThreadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`threads/${id}/vote/`);
    },
    onSuccess: () => {
      refetchThreads();
      if (selectedThreadId) refetchActiveThread();
    }
  });

  // 6. Vote Reply Mutation
  const voteReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`replies/${id}/vote/`);
    },
    onSuccess: () => {
      refetchActiveThread();
    }
  });

  // 7. Lock/Pin/Accept Mutations (Instructor Actions)
  const lockMutation = useMutation({
    mutationFn: async ({ id, lock }: { id: string; lock: boolean }) => {
      await api.post(`threads/${id}/lock/`, { lock });
    },
    onSuccess: () => {
      toast.success('Thread lock status toggled.');
      refetchActiveThread();
      refetchThreads();
    }
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: boolean }) => {
      await api.post(`threads/${id}/pin/`, { pin });
    },
    onSuccess: () => {
      toast.success('Thread pin status toggled.');
      refetchActiveThread();
      refetchThreads();
    }
  });

  const acceptReplyMutation = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      await api.post(`replies/${id}/accept/`, { accept });
    },
    onSuccess: () => {
      toast.success('Accepted answer status updated.');
      refetchActiveThread();
    }
  });

  const isInstructor = user?.id === instructorId;

  // Filtered threads list
  const filteredThreads = threads.filter((t) => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedThreadId && activeThread) {
    return (
      <div className="space-y-4 text-xs">
        <button 
          onClick={() => setSelectedThreadId(null)}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-bold mb-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Discussions
        </button>

        <Card className="p-4 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{activeThread.title}</h3>
                {activeThread.is_pinned && <span title="Pinned Announcement"><Pin className="h-3.5 w-3.5 text-brand-650 fill-current" /></span>}
                {activeThread.is_locked && <span title="Locked Thread"><Lock className="h-3.5 w-3.5 text-slate-400" /></span>}
              </div>
              <p className="text-[10px] text-slate-400">Asked by {activeThread.author_name} • {new Date(activeThread.created_at).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={() => voteThreadMutation.mutate(activeThread.id)}
              className="flex items-center gap-1 border px-2.5 py-1 rounded-xl hover:bg-slate-50 text-[10px] text-slate-650"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              <span>Upvote ({activeThread.vote_count})</span>
            </button>
          </div>

          <p className="text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{activeThread.content}</p>

          {/* Instructor actions */}
          {isInstructor && (
            <div className="flex gap-2 pt-2 border-t text-[10px]">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => pinMutation.mutate({ id: activeThread.id, pin: !activeThread.is_pinned })}
                isLoading={pinMutation.isPending}
              >
                {activeThread.is_pinned ? 'Unpin thread' : 'Pin thread'}
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => lockMutation.mutate({ id: activeThread.id, lock: !activeThread.is_locked })}
                isLoading={lockMutation.isPending}
              >
                {activeThread.is_locked ? 'Unlock thread' : 'Lock thread'}
              </Button>
            </div>
          )}
        </Card>

        {/* Replies list */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Replies ({activeThread.replies?.length || 0})</h4>
          {activeThread.replies?.map((r: any) => (
            <div 
              key={r.id} 
              className={`p-3.5 border rounded-2xl space-y-2 relative ${r.is_accepted ? 'border-emerald-600 bg-emerald-50/10 dark:bg-emerald-950/5' : ''}`}
            >
              {r.is_accepted && (
                <div className="absolute right-4 top-3 flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Accepted Answer
                </div>
              )}

              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>{r.author_name} • {new Date(r.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => voteReplyMutation.mutate(r.id)}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    <ThumbsUp className="h-3 w-3" />
                    <span>({r.vote_count})</span>
                  </button>
                  {isInstructor && (
                    <button 
                      onClick={() => acceptReplyMutation.mutate({ id: r.id, accept: !r.is_accepted })}
                      className="hover:underline text-brand-600 font-bold"
                    >
                      {r.is_accepted ? 'Unaccept' : 'Accept Answer'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-slate-650 dark:text-slate-350 leading-relaxed">{r.content}</p>
            </div>
          ))}

          {activeThread.replies?.length === 0 && (
            <p className="text-slate-400 text-center py-4">No replies yet. Be the first to answer!</p>
          )}
        </div>

        {/* Write a Reply */}
        {!activeThread.is_locked ? (
          <div className="space-y-2 mt-4">
            <textarea
              placeholder="Write your response to this thread..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full text-xs rounded-xl border p-3 bg-white dark:bg-slate-950 focus:outline-none h-20"
            />
            <Button
              size="sm"
              onClick={() => createReplyMutation.mutate()}
              isLoading={createReplyMutation.isPending}
            >
              Post Reply
            </Button>
          </div>
        ) : (
          <div className="text-slate-400 text-center py-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed">
            This thread has been locked by the instructor.
          </div>
        )}
      </div>
    );
  }

  if (isCreatingThread) {
    return (
      <div className="space-y-4 text-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Start a New Discussion</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Topic Title</label>
            <Input 
              placeholder="e.g. Help with deployment error"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Detailed Description</label>
            <textarea
              placeholder="Describe your question or announcement in detail..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full text-xs rounded-xl border p-3 bg-white dark:bg-slate-950 focus:outline-none h-24"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm"
              onClick={() => createThreadMutation.mutate()}
              isLoading={createThreadMutation.isPending}
            >
              Create Topic
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setIsCreatingThread(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs py-1.5"
          />
        </div>
        <Button 
          size="sm" 
          className="flex items-center gap-1 shrink-0 text-[10px] font-bold"
          onClick={() => setIsCreatingThread(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Ask Question
        </Button>
      </div>

      <div className="space-y-3">
        {filteredThreads.map((t) => (
          <div 
            key={t.id}
            onClick={() => setSelectedThreadId(t.id)}
            className="p-4 border rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all cursor-pointer flex justify-between items-center gap-4"
          >
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white hover:underline truncate block">
                  {t.title}
                </span>
                {t.is_pinned && <span title="Pinned"><Pin className="h-3 w-3 text-brand-650 fill-current" /></span>}
                {t.is_locked && <span title="Locked"><Lock className="h-3 w-3 text-slate-400" /></span>}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Started by {t.author_name} • {new Date(t.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-4 text-slate-400 font-semibold shrink-0 text-[10px]">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{t.vote_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{t.replies_count}</span>
              </div>
            </div>
          </div>
        ))}

        {filteredThreads.length === 0 && (
          <div className="text-center py-8 text-slate-400 font-light leading-relaxed">
            No discussions match your search. Start a new thread to get help!
          </div>
        )}
      </div>
    </div>
  );
};
