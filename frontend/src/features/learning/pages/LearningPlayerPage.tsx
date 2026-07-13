import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { type Section, type Lesson } from '../../curriculum/types';
import { VideoPlayer } from '../components/VideoPlayer';
import { LearningSidebar } from '../components/LearningSidebar';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { triggerConfetti } from '../../../components/ui/Confetti';
import { QuizPlayer } from '../components/QuizPlayer';
import { AssignmentWorkspace } from '../components/AssignmentWorkspace';
import { DiscussionsTab } from '../components/DiscussionsTab';
import { ChatConsole } from '../components/ChatConsole';
import { CourseReviews } from '../../courses/components/CourseReviews';
import { AITutorSidebar } from '../components/AITutorSidebar';
import { FlashcardsTab } from '../components/FlashcardsTab';
import { 
  ArrowLeft, 
  BookOpen, 
  Download, 
  FileText, 
  ExternalLink,
  HelpCircle,
  Bookmark,
  Clock,
  Code,
  Calendar,
  Sparkles,
  Search,
  Eye,
  FileDown
} from 'lucide-react';

interface ClassroomPayload {
  course: any;
  sections: Section[];
  progress: {
    completed_count: number;
    total_count: number;
    percentage: number;
  };
}

export const LearningPlayerPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeTab, setActiveTab] = useState<'curriculum' | 'about' | 'resources' | 'notes' | 'bookmarks' | 'discussions' | 'messages' | 'reviews' | 'tutor' | 'flashcards'>('about');
  
  // Notes states
  const [notesText, setNotesText] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [videoTime, setVideoTime] = useState(0);

  // Coding exercise states
  const [codeContent, setCodeContent] = useState('// Write your solution here...\n\nfunction main() {\n  console.log("Hello SkillsSphere!");\n  return true;\n}\n\nmain();');
  const [runOutputs, setRunOutputs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);
  const [codingTab, setCodingTab] = useState<'instructions' | 'editor' | 'output'>('instructions');
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  // Fetch course classroom details
  const { data: classroom, isLoading, error } = useQuery<ClassroomPayload>({
    queryKey: ['classroom-workspace', slug],
    queryFn: async () => {
      const response = await api.get(`learning/classroom/${slug}/`);
      return response.data;
    },
    enabled: !!slug,
  });

  // Fetch bookmarks
  const { data: bookmarks = [], refetch: refetchBookmarks } = useQuery<any[]>({
    queryKey: ['my-bookmarks-list'],
    queryFn: async () => {
      const response = await api.get('learning/bookmarks/');
      return response.data;
    }
  });

  // Select initial lesson on mount or data load
  useEffect(() => {
    if (classroom && classroom.sections.length > 0 && !activeLesson) {
      const firstSectionWithLessons = classroom.sections.find(s => s.lessons.length > 0);
      if (firstSectionWithLessons && firstSectionWithLessons.lessons.length > 0) {
        const incomplete = firstSectionWithLessons.lessons.find(l => !l.is_completed);
        setActiveLesson(incomplete || firstSectionWithLessons.lessons[0]);
      }
    }
  }, [classroom, activeLesson]);

  // Watch for 100% course completion to trigger confetti celebration
  useEffect(() => {
    if (classroom?.progress.percentage === 100 && !hasCelebrated) {
      setShowCelebrationModal(true);
      setHasCelebrated(true);
      triggerConfetti();
    } else if (classroom?.progress.percentage !== 100) {
      setHasCelebrated(false);
    }
  }, [classroom?.progress.percentage, hasCelebrated]);

  // Load saved notes & coding exercises for this lesson
  useEffect(() => {
    if (activeLesson && user?.id) {
      const savedNote = localStorage.getItem(`skillsphere-note-${user.id}-${activeLesson.id}`);
      setNotesText(savedNote || '');
      
      const savedCode = localStorage.getItem(`skillsphere-code-${user.id}-${activeLesson.id}`);
      if (savedCode) {
        setCodeContent(savedCode);
      } else {
        setCodeContent('// Write your solution here...\n\nfunction main() {\n  console.log("Running simulated test suite...");\n  return true;\n}\n\nmain();');
      }
      setRunOutputs([]);
      setHasPassed(false);
    }
  }, [activeLesson, user?.id]);

  // Listen to video current position pings
  useEffect(() => {
    const handleTimePing = (e: any) => {
      if (typeof e.detail?.seconds === 'number') {
        setVideoTime(e.detail.seconds);
      }
    };
    window.addEventListener('video-time-ping', handleTimePing);
    return () => {
      window.removeEventListener('video-time-ping', handleTimePing);
    };
  }, []);

  // Auto-save notes with 1 second debounce
  useEffect(() => {
    if (!activeLesson || !classroom || !user?.id) return;
    const timer = setTimeout(() => {
      localStorage.setItem(`skillsphere-note-${user.id}-${activeLesson.id}`, notesText);
      
      // Update global search index
      const savedMap = localStorage.getItem(`skillsphere-all-notes-${user.id}`);
      const map = savedMap ? JSON.parse(savedMap) : {};
      map[activeLesson.id] = {
        text: notesText,
        lessonTitle: activeLesson.title,
        courseTitle: classroom.course.title,
        lessonId: activeLesson.id,
        courseSlug: slug
      };
      localStorage.setItem(`skillsphere-all-notes-${user.id}`, JSON.stringify(map));
    }, 1000);

    return () => clearTimeout(timer);
  }, [notesText, activeLesson, classroom, slug, user?.id]);

  // Toggle Bookmark Mutation
  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!activeLesson) return;
      await api.post('learning/bookmarks/toggle/', { lesson_id: activeLesson.id });
    },
    onSuccess: () => {
      refetchBookmarks();
      toast.success('Bookmark updated!');
    }
  });

  // Toggle Complete Mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ lessonId, isCompleted }: { lessonId: string; isCompleted: boolean }) => {
      const response = await api.post(`learning/${lessonId}/complete/`, { is_completed: isCompleted });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classroom-workspace', slug] });
      if (activeLesson && activeLesson.id === variables.lessonId) {
        setActiveLesson(prev => prev ? { ...prev, is_completed: variables.isCompleted } : null);
      }
      toast.success(variables.isCompleted ? 'Marked complete!' : 'Marked incomplete');
    }
  });

  const handleSelectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
  };

  const handleToggleComplete = (lessonId: string, currentStatus: boolean) => {
    toggleCompleteMutation.mutate({ lessonId, isCompleted: !currentStatus });
  };

  // Seek video helper
  const seekVideo = (seconds: number) => {
    window.dispatchEvent(new CustomEvent('classroom-seek-video', { detail: { seconds } }));
  };

  // Insert timestamp helper
  const insertTimestamp = () => {
    const mins = Math.floor(videoTime / 60);
    const secs = Math.floor(videoTime % 60);
    const timestampStr = `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
    setNotesText(prev => prev + `\n${timestampStr} `);
  };

  // Export notes
  const exportNoteAsMarkdown = () => {
    if (!activeLesson || !classroom) return;
    const content = `# Notes for ${activeLesson.title}\nCourse: ${classroom.course.title}\n\n${notesText}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeLesson.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_notes.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Notes exported successfully.');
  };

  // Parse timestamps from text notes
  const getTimestampsFromNotes = (text: string) => {
    const regex = /\[(\d{1,2}):(\d{2})\]/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        label: match[0],
        seconds: parseInt(match[1]) * 60 + parseInt(match[2])
      });
    }
    return matches;
  };

  // Simulated code execution compiler
  const runCodingTests = () => {
    setIsRunning(true);
    setRunOutputs(['Initializing workspace environment...', 'Running package tests...']);
    
    if (user?.id) {
      localStorage.setItem(`skillsphere-code-${user.id}-${activeLesson?.id}`, codeContent);
    }

    setTimeout(() => {
      setIsRunning(false);
      if (codeContent.trim().length < 50) {
        setRunOutputs(prev => [
          ...prev, 
          'Error: Solution is too short or empty.', 
          'Test suite failed: Code length must be at least 50 characters to execute correctly.'
        ]);
        setHasPassed(false);
      } else {
        setRunOutputs(prev => [
          ...prev,
          '✓ Test 1: Function exists (Passed)',
          '✓ Test 2: Handles array values (Passed)',
          '✓ Test 3: Time complexity within 200ms (Passed)',
          'All 3 test suites passed successfully!'
        ]);
        setHasPassed(true);
        // Automatically complete the lesson on test pass!
        if (activeLesson && !activeLesson.is_completed) {
          toggleCompleteMutation.mutate({ lessonId: activeLesson.id, isCompleted: true });
        }
      }
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-bold">Entering classroom workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <Card className="max-w-md p-6 text-center space-y-4">
          <HelpCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-905">Access Denied</h3>
          <p className="text-xs text-slate-500">
            Please make sure you are actively enrolled in this course before opening the student classroom.
          </p>
          <Button onClick={() => navigate('/courses')}>Browse Course Catalog</Button>
        </Card>
      </div>
    );
  }

  const { course, sections, progress } = classroom;
  const isBookmarked = bookmarks.some((b: any) => b.lesson?.id === activeLesson?.id);

  // Notes Search filter
  const allSavedNotesMap = JSON.parse(localStorage.getItem(`skillsphere-all-notes-${user?.id}`) || '{}');
  const searchResults = Object.values(allSavedNotesMap).filter((note: any) => {
    if (!notesSearchQuery.trim()) return false;
    return note.text.toLowerCase().includes(notesSearchQuery.toLowerCase()) && note.courseSlug === slug;
  });

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-955 overflow-hidden">
      {/* Learning Header */}
      <header className="h-14 border-b border-slate-200/50 dark:border-slate-900/60 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-1.5 text-slate-455 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>
          <div className="h-px w-4 bg-slate-200 dark:bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wide">Learning Classroom</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 tracking-tight">{course.title}</span>
          </div>
        </div>

        {/* Progress percent stats */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-405">{progress.completed_count}/{progress.total_count} Completed</span>
            <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden border">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/30 px-2 py-0.5 rounded-md">
            {progress.percentage}% Done
          </span>
        </div>
      </header>

      {/* Main Classroom Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left curriculum sidebar - hidden on mobile and tablet, side-by-side on desktop */}
        <div className="hidden lg:block h-full shrink-0">
          <LearningSidebar
            sections={sections}
            activeLessonId={activeLesson?.id}
            onSelectLesson={handleSelectLesson}
            onToggleComplete={handleToggleComplete}
            courseTitle={course.title}
          />
        </div>

        {/* Right content view area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {activeLesson ? (
            <div className="p-6 max-w-4xl mx-auto w-full space-y-6 flex-1 flex flex-col">
              
              {/* Core Lesson media/body display */}
              <div className="space-y-4">
                {activeLesson.lesson_type === 'VIDEO' ? (
                  activeLesson.video_url || activeLesson.content_file ? (
                    <VideoPlayer
                      key={activeLesson.id}
                      lessonId={activeLesson.id}
                      videoUrl={activeLesson.video_url || activeLesson.content_file || ''}
                      initialPosition={activeLesson.last_position || 0}
                    />
                  ) : (
                    <div className="aspect-video w-full rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-400">
                      No video URL or file uploaded for this lesson yet.
                    </div>
                  )
                ) : activeLesson.lesson_type === 'ARTICLE' ? (
                  <Card className="p-8 border-slate-200/50 dark:border-slate-800/40 prose dark:prose-invert max-w-none bg-white dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-amber-600 bg-amber-50/50 dark:bg-amber-955/20 border border-amber-100/30 px-2.5 py-1 rounded-md w-fit">
                      <FileText className="h-4 w-4" />
                      Reading Assignment
                    </div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-4 tracking-tight">{activeLesson.title}</h2>
                    <div className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed whitespace-pre-wrap font-light">
                      {activeLesson.content_text || 'No text content available for this lesson.'}
                    </div>
                  </Card>
                ) : activeLesson.lesson_type === 'LIVE' ? (
                  <Card className="p-8 border-slate-200/50 dark:border-slate-800/40 space-y-6 bg-white dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 px-2.5 py-1 rounded-md w-fit">
                      <Calendar className="h-4 w-4" />
                      Virtual Live Webcast Session
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-slate-950 dark:text-white tracking-tight">{activeLesson.title}</h2>
                      <p className="text-xs text-slate-500 font-light">
                        {activeLesson.description || 'Outline review meeting notes and calendar reminders.'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200/40 dark:border-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Meeting Schedule</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Scheduled for Today • 7:00 PM (Local Time)</span>
                      </div>
                      {activeLesson.external_link ? (
                        <a href={activeLesson.external_link} target="_blank" rel="noreferrer">
                          <Button size="sm" className="text-white font-bold">
                            Join Live Session
                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </a>
                      ) : (
                        <span className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-955/20 px-2 py-1 rounded border border-rose-100/30">No meeting link provided</span>
                      )}
                    </div>
                  </Card>
                ) : activeLesson.lesson_type === 'CODING' ? (
                  <div className="space-y-4">
                    {/* Mobile Tab Selector */}
                    <div className="flex lg:hidden border-b border-slate-200 dark:border-slate-850 pb-1 mb-2 text-xs font-semibold text-slate-400">
                      <button
                        onClick={() => setCodingTab('instructions')}
                        className={`pb-1 border-b-2 mr-4 transition-all ${codingTab === 'instructions' ? 'text-indigo-600 border-indigo-500 font-bold' : 'border-transparent'}`}
                      >
                        Instructions
                      </button>
                      <button
                        onClick={() => setCodingTab('editor')}
                        className={`pb-1 border-b-2 mr-4 transition-all ${codingTab === 'editor' ? 'text-indigo-600 border-indigo-500 font-bold' : 'border-transparent'}`}
                      >
                        Code Editor
                      </button>
                      <button
                        onClick={() => setCodingTab('output')}
                        className={`pb-1 border-b-2 transition-all ${codingTab === 'output' ? 'text-indigo-600 border-indigo-500 font-bold' : 'border-transparent'}`}
                      >
                        Console Output
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                      {/* Left instructions block */}
                      <Card className={`p-6 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/50 flex flex-col justify-between ${codingTab === 'instructions' ? 'block' : 'hidden lg:flex'}`}>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/30 px-2.5 py-1 rounded-md w-fit">
                            <Code className="h-4 w-4" />
                            Interactive Coding Workspace
                          </div>
                          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{activeLesson.title}</h2>
                          <div className="text-slate-600 dark:text-slate-350 text-xs leading-relaxed whitespace-pre-wrap font-light">
                            {activeLesson.content_text || 'Complete the interactive coding assignment below by matching required method criteria.'}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-400 flex items-center gap-1.5 font-light">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          Complete exercise successfully to unlock next lesson.
                        </div>
                      </Card>

                      {/* Right text area code editor */}
                      <Card className={`border-slate-800 p-4 bg-slate-950 text-white flex flex-col justify-between gap-4 font-mono ${codingTab === 'editor' ? 'block' : codingTab === 'output' ? 'block lg:hidden' : 'hidden lg:flex'}`}>
                        <div className={codingTab === 'output' ? 'hidden' : 'block'}>
                          <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-[10px] text-slate-500">
                            <span>solution.js</span>
                            <span>Javascript</span>
                          </div>
                          <textarea
                            value={codeContent}
                            onChange={(e) => setCodeContent(e.target.value)}
                            className="w-full bg-transparent text-xs text-emerald-450 font-mono focus:outline-none py-3 resize-none h-44 leading-relaxed"
                          />
                        </div>

                        {/* Run Console output logger */}
                        <div className={`space-y-3 ${codingTab === 'editor' ? 'block' : codingTab === 'output' ? 'block' : 'hidden lg:block'}`}>
                          <div className="bg-black/40 border border-slate-800 rounded-lg p-2.5 text-[9px] text-slate-300 min-h-[120px] overflow-y-auto space-y-1">
                            {runOutputs.length === 0 ? (
                              <span className="text-slate-550">// Outputs will display here after running tests</span>
                            ) : (
                              runOutputs.map((line, idx) => (
                                <p key={idx} className={line.includes('Error') ? 'text-rose-500 font-bold' : line.includes('passed') ? 'text-emerald-500 font-bold' : ''}>
                                  {line}
                                </p>
                              ))
                            )}
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={runCodingTests} 
                              disabled={isRunning}
                              size="sm" 
                              variant="secondary"
                              className="bg-slate-800 hover:bg-slate-705 border-0 text-white text-[10px] font-bold py-1 px-3"
                            >
                              {isRunning ? 'Running...' : 'Run Tests'}
                            </Button>
                            <Button
                              onClick={runCodingTests}
                              disabled={isRunning || hasPassed}
                              size="sm"
                              className="text-[10px] font-bold py-1 px-3"
                            >
                              Submit Answer
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                ) : activeLesson.lesson_type === 'QUIZ' ? (
                  <QuizPlayer 
                    lessonId={activeLesson.id} 
                    onComplete={() => queryClient.invalidateQueries({ queryKey: ['classroom-workspace', slug] })}
                  />
                ) : activeLesson.lesson_type === 'ASSIGNMENT' ? (
                  <AssignmentWorkspace 
                    lessonId={activeLesson.id} 
                    onComplete={() => queryClient.invalidateQueries({ queryKey: ['classroom-workspace', slug] })}
                  />
                ) : (
                  <Card className="p-8 border-slate-200/50 dark:border-slate-800/40 text-center space-y-4 bg-white dark:bg-slate-900/50">
                    <div className="h-10 w-10 rounded-md bg-rose-50/50 dark:bg-rose-955/20 text-rose-650 flex items-center justify-center mx-auto border border-rose-100/30">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-955 dark:text-white tracking-tight">{activeLesson.title}</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto font-light leading-normal">
                      This lesson requires review of an attached PDF or external link resource. Use the tabs below to download files or open links.
                    </p>
                    {activeLesson.external_link && (
                      <a 
                        href={activeLesson.external_link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-650 hover:underline"
                      >
                        Open External Resource
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </Card>
                )}

                {/* Lesson title bar with Bookmarks */}
                <div className="flex justify-between items-start gap-4 pt-2">
                  <div className="flex gap-3 items-start">
                    <button
                      onClick={() => toggleBookmarkMutation.mutate()}
                      className="p-2 border border-slate-200/60 dark:border-slate-805 rounded-lg hover:bg-slate-55 dark:hover:bg-slate-900 transition-colors shrink-0 cursor-pointer"
                      title="Bookmark this lesson"
                    >
                      <Bookmark className={`h-4.5 w-4.5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    </button>

                    <div>
                      <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {activeLesson.title}
                      </h1>
                      <p className="text-xs text-slate-500 mt-1 font-light leading-normal">
                        {activeLesson.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    variant={activeLesson.is_completed ? 'secondary' : 'primary'}
                    onClick={() => handleToggleComplete(activeLesson.id, !!activeLesson.is_completed)}
                  >
                    {activeLesson.is_completed ? 'Mark Incomplete' : 'Mark as Complete'}
                  </Button>
                </div>
              </div>

              {/* Bottom Tabs Panel */}
              <div className="border-t border-slate-200/60 dark:border-slate-800/40 pt-4 flex-1 flex flex-col">
                <div className="flex gap-4 border-b border-slate-200/65 dark:border-slate-850/65 pb-2 mb-4 text-xs font-bold text-slate-400 select-none overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab('curriculum')}
                    className={`pb-2 border-b-2 transition-all shrink-0 lg:hidden cursor-pointer ${activeTab === 'curriculum' ? 'text-indigo-650 border-indigo-500 font-bold' : 'border-transparent hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Curriculum
                  </button>
                  <button 
                    onClick={() => setActiveTab('about')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'about' ? 'text-indigo-650 border-indigo-500' : 'border-transparent hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    About Lesson
                  </button>
                  <button 
                    onClick={() => setActiveTab('resources')}
                    className={`pb-2 border-b-2 transition-all flex items-center gap-1 shrink-0 cursor-pointer ${activeTab === 'resources' ? 'text-indigo-650 border-indigo-500' : 'border-transparent hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Resources
                    {activeLesson.resources.length > 0 && (
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-655 px-1 py-0.5 rounded text-[8px]">
                        {activeLesson.resources.length}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('notes')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'notes' ? 'text-indigo-650 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    Personal Notepad
                  </button>
                  <button
                    onClick={() => setActiveTab('bookmarks')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'bookmarks' ? 'text-indigo-650 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    My Bookmarks
                  </button>
                  <button
                    onClick={() => setActiveTab('discussions')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'discussions' ? 'text-indigo-650 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    Q&A Discussion
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'messages' ? 'text-indigo-650 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    Ask Instructor
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'reviews' ? 'text-indigo-655 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    Reviews & Ratings
                  </button>
                  <button
                    onClick={() => setActiveTab('tutor')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'tutor' ? 'text-indigo-655 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    AI Tutor
                  </button>
                  <button
                    onClick={() => setActiveTab('flashcards')}
                    className={`pb-2 border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === 'flashcards' ? 'text-indigo-655 border-indigo-500' : 'border-transparent hover:text-slate-900'}`}
                  >
                    AI Flashcards
                  </button>
                </div>

                {/* Tab content renders */}
                <div className="flex-1">
                  {activeTab === 'curriculum' && (
                    <div className="lg:hidden w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                      <LearningSidebar
                        sections={sections}
                        activeLessonId={activeLesson?.id}
                        onSelectLesson={handleSelectLesson}
                        onToggleComplete={handleToggleComplete}
                        courseTitle={course.title}
                        isMobileMode={true}
                      />
                    </div>
                  )}

                  {activeTab === 'about' && (
                    <div className="space-y-4 text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-light">
                      <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-205 dark:border-slate-850">
                        <h4 className="font-bold text-slate-850 dark:text-white uppercase tracking-wider text-[10px] mb-2">Lesson Specs</h4>
                        <ul className="space-y-1 font-medium">
                          <li>Type: <span className="font-bold text-slate-800 dark:text-slate-250">{activeLesson.lesson_type}</span></li>
                          <li>Duration: <span className="font-bold text-slate-800 dark:text-slate-250">{activeLesson.duration} minutes</span></li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {activeTab === 'resources' && (
                    <div className="space-y-2">
                      {activeLesson.resources.length === 0 ? (
                        <p className="text-xs text-slate-400 font-light">No resources attached to this lesson.</p>
                      ) : (
                        activeLesson.resources.map((resource) => (
                          <div key={resource.id} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 p-3 rounded-lg text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{resource.title}</span>
                            <a 
                              href={resource.file}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-650 hover:text-indigo-500 font-bold inline-flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'notes' && (
                    <div className="space-y-4">
                      {/* Search and preview controls */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        <div className="flex flex-wrap gap-2 items-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setIsPreviewMode(!isPreviewMode)}
                            className="text-[10px] py-1 px-3"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {isPreviewMode ? 'Edit Mode' : 'Markdown Preview'}
                          </Button>
                          
                          {activeLesson.lesson_type === 'VIDEO' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={insertTimestamp}
                              className="text-[10px] py-1 px-3"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Insert Current Timestamp
                            </Button>
                          )}

                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={exportNoteAsMarkdown}
                            disabled={!notesText.trim()}
                            className="text-[10px] py-1 px-3"
                          >
                            <FileDown className="h-3.5 w-3.5 mr-1" />
                            Export .md
                          </Button>
                        </div>

                        {/* Note Search widget */}
                        <div className="relative w-full sm:w-44">
                          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={notesSearchQuery}
                            onChange={(e) => setNotesSearchQuery(e.target.value)}
                            placeholder="Search workspace..."
                            className="pl-8 pr-3 py-1.5 block w-full text-[10px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Display Search Results */}
                      {notesSearchQuery && (
                        <div className="bg-slate-100/60 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800/40 space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Search outcomes ({searchResults.length}):</p>
                          {searchResults.map((res: any, idx) => (
                            <div key={idx} className="text-[10px] p-2 border-b border-slate-200 dark:border-slate-800 last:border-b-0 space-y-1">
                              <p className="font-bold text-indigo-650">{res.lessonTitle}</p>
                              <p className="text-slate-655 dark:text-slate-350 line-clamp-2 leading-relaxed font-light">{res.text}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Notepad Area */}
                      {isPreviewMode ? (
                        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs whitespace-pre-wrap leading-relaxed font-light">
                          {notesText.trim() ? notesText : <span className="text-slate-400">Notepad is empty. Switch to Edit Mode to write.</span>}
                        </div>
                      ) : (
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Write down markdown notes, code snippets, or timestamp tags [MM:SS] to link play positions..."
                          rows={6}
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none"
                        />
                      )}

                      {/* Render timestamps pills parsed from notepad */}
                      {getTimestampsFromNotes(notesText).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Interactive Timestamps:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {getTimestampsFromNotes(notesText).map((ts, idx) => (
                              <button 
                                key={idx}
                                onClick={() => seekVideo(ts.seconds)}
                                className="px-2 py-0.5 rounded-md bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 border border-indigo-100/40 text-[9px] font-bold hover:bg-indigo-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {ts.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'bookmarks' && (
                    <div className="space-y-3">
                      {bookmarks.length === 0 ? (
                        <p className="text-xs text-slate-400 font-light">You haven't bookmarked any lessons inside this classroom yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {bookmarks.map((bookmark) => (
                            <div 
                              key={bookmark.id}
                              onClick={() => {
                                if (bookmark.lesson) setActiveLesson(bookmark.lesson);
                              }}
                              className="p-3 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50 rounded-xl cursor-pointer flex justify-between items-center gap-2 transition-colors"
                            >
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-850 dark:text-white truncate">{bookmark.lesson?.title}</h4>
                                <span className="text-[9px] text-slate-400 block mt-0.5 font-light">Type: {bookmark.lesson?.lesson_type}</span>
                              </div>
                              <Bookmark className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'discussions' && classroom?.course && (
                    <DiscussionsTab 
                      courseId={classroom.course.id} 
                      instructorId={classroom.course.instructor.id}
                    />
                  )}

                  {activeTab === 'messages' && classroom?.course && (
                    <ChatConsole 
                      instructorId={classroom.course.instructor.id} 
                    />
                  )}

                  {activeTab === 'reviews' && classroom?.course && (
                    <CourseReviews 
                      courseId={classroom.course.id}
                      rating={classroom.course.rating || 5.0}
                      reviewsCount={classroom.course.reviews_count || 0}
                      ratingDistribution={classroom.course.rating_distribution || {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}}
                      isEnrolled={!!classroom.course.is_enrolled}
                      instructorId={classroom.course.instructor.id}
                      progressPercent={classroom.course.progress_percent || 0}
                    />
                  )}

                  {activeTab === 'tutor' && classroom?.course && activeLesson && (
                    <AITutorSidebar 
                      courseId={classroom.course.id} 
                      lessonId={activeLesson.id} 
                    />
                  )}

                  {activeTab === 'flashcards' && activeLesson && (
                    <FlashcardsTab 
                      lessonId={activeLesson.id} 
                    />
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-light">
              No lessons available inside this course curriculum.
            </div>
          )}

          {/* Celebration Modal */}
          {showCelebrationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-sm" onClick={() => setShowCelebrationModal(false)} />
              <Card className="relative w-full max-w-sm p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
                <div className="relative mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-900 text-indigo-600 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <Sparkles className="h-8 w-8" />
                  <span className="absolute -top-1 -right-1 text-lg">🎉</span>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Congratulations!</h2>
                  <p className="text-xs font-bold text-indigo-650 dark:text-indigo-400">Course Completed Successfully</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-light">
                    You completed all modules and lessons in <span className="font-semibold text-slate-700 dark:text-slate-200">"{course.title}"</span>. You've officially earned your Certificate of Completion!
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                  <Button onClick={() => {
                    setShowCelebrationModal(false);
                    navigate('/dashboard');
                  }}>
                    View Certificate in Dashboard
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowCelebrationModal(false)}>
                    Continue Learning
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningPlayerPage;
