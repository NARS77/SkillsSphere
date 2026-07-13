import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { triggerConfetti } from '../../../components/ui/Confetti';
import { Clock, Flag, CheckCircle, ChevronLeft, ChevronRight, Minimize, Maximize } from 'lucide-react';

interface QuizPlayerProps {
  lessonId: string;
  onComplete: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ lessonId, onComplete }) => {
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [attemptData, setAttemptData] = useState<any | null>(null);
  
  // Quiz states
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<any | null>(null);
  
  // Student inputs: { question_attempt_id: { ... } }
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});

  // 1. Fetch Quiz Details
  const { data: quiz, isLoading: isLoadingQuiz } = useQuery({
    queryKey: ['classroom-quiz', lessonId],
    queryFn: async () => {
      const res = await api.get(`quizzes/?lesson_id=${lessonId}`);
      const results = res.data.results || res.data;
      if (results.length === 0) throw new Error('Quiz not found');
      return results[0];
    }
  });

  // 2. Fetch Attempts list to check for active IN_PROGRESS attempt
  const { data: attempts = [], refetch: refetchAttempts } = useQuery({
    queryKey: ['quiz-attempts-history', quiz?.id],
    queryFn: async () => {
      const res = await api.get(`quiz-attempts/?quiz=${quiz.id}`);
      return res.data.results || res.data;
    },
    enabled: !!quiz?.id
  });

  const activeAttempt = attempts.find((a: any) => a.status === 'IN_PROGRESS');

  // Load attempt details if active
  useEffect(() => {
    if (activeAttempt) {
      setActiveAttemptId(activeAttempt.id);
      api.get(`quiz-attempts/${activeAttempt.id}/`).then((res) => {
        setAttemptData(res.data);
        
        // Populate existing answers from backend
        const initialAnswers: Record<string, any> = {};
        res.data.question_attempts.forEach((qa: any) => {
          initialAnswers[qa.id] = {
            selected_option: qa.selected_options?.[0] || null,
            selected_options: qa.selected_options || [],
            text_answer: qa.text_answer || '',
            ordering_answer: qa.ordering_answer || [],
            matching_answer: qa.matching_answer || {},
            flagged: qa.flagged || false,
            time_spent: qa.time_spent || 0
          };
        });
        setStudentAnswers(initialAnswers);
        
        // Setup timer
        if (quiz?.time_limit > 0) {
          const started = new Date(res.data.started_at).getTime();
          const elapsed = Math.floor((Date.now() - started) / 1000);
          const limitSeconds = quiz.time_limit * 60;
          const remaining = limitSeconds - elapsed;
          setTimeLeft(remaining > 0 ? remaining : 0);
        }
      });
    } else {
      setActiveAttemptId(null);
      setAttemptData(null);
    }
  }, [activeAttempt, quiz]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && activeAttemptId) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && activeAttemptId) {
      toast.info('Time is up! Submitting your answers automatically.');
      handleSubmitQuiz();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, activeAttemptId]);

  // Start attempt mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`quizzes/${quiz.id}/start/`);
      return res.data;
    },
    onSuccess: () => {
      refetchAttempts();
      toast.success('Quiz attempt started!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to start attempt.');
    }
  });

  // Submit attempt mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formattedAnswers: Record<string, any> = {};
      Object.keys(studentAnswers).forEach((key) => {
        const val = studentAnswers[key];
        formattedAnswers[key] = {
          selected_option: val.selected_option,
          selected_options: val.selected_options,
          text_answer: val.text_answer,
          ordering_answer: val.ordering_answer,
          matching_answer: val.matching_answer,
          flagged: val.flagged,
          time_spent: val.time_spent
        };
      });
      
      const res = await api.post(`quiz-attempts/${activeAttemptId}/submit/`, {
        answers: formattedAnswers
      });
      return res.data;
    },
    onSuccess: (data) => {
      refetchAttempts();
      setActiveAttemptId(null);
      setAttemptData(null);
      setTimeLeft(null);
      onComplete(); // callback to trigger dashboard refresh
      if (data && data.passed) {
        toast.success(`Excellent work! You passed with ${data.percentage}%!`);
        triggerConfetti();
      } else if (data) {
        toast.info(`Quiz submitted. Score: ${data.percentage}% (Required: ${quiz?.passing_percentage}%)`);
      } else {
        toast.success('Quiz submitted successfully!');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to submit quiz.');
    }
  });

  const handleStartQuiz = () => {
    startMutation.mutate();
  };

  const handleSubmitQuiz = () => {
    submitMutation.mutate();
  };

  // Update answers state helper
  const updateAnswer = (qaId: string, updates: Partial<any>) => {
    setStudentAnswers(prev => ({
      ...prev,
      [qaId]: {
        ...prev[qaId],
        ...updates
      }
    }));
  };

  if (isLoadingQuiz) return <div className="text-xs text-slate-400 p-8 text-center">Loading assessment details...</div>;
  if (!quiz) return <div className="text-xs text-slate-400 p-8 text-center">Assessment not found.</div>;

  // Render Start Page if no active attempt is running
  if (!activeAttemptId) {
    const lastAttempt = attempts.find((a: any) => a.status === 'SUBMITTED');
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-10">
        <Card className="p-8 border-slate-200/50 space-y-6 text-center bg-white dark:bg-slate-900">
          <div className="h-16 w-16 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
            <CheckCircle className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{quiz.title}</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {quiz.description || 'Complete this quiz assessment to check your understanding of the curriculum.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-xs border-t border-b py-4">
            <div className="text-left space-y-1">
              <span className="text-slate-400 block font-semibold">PASSING SCORE</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{quiz.passing_percentage}% or higher</span>
            </div>
            <div className="text-left space-y-1">
              <span className="text-slate-400 block font-semibold">TIME LIMIT</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{quiz.time_limit > 0 ? `${quiz.time_limit} Minutes` : 'Unlimited'}</span>
            </div>
            <div className="text-left space-y-1">
              <span className="text-slate-400 block font-semibold">MAX ATTEMPTS</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{quiz.max_attempts > 0 ? `${quiz.max_attempts} Attempts` : 'Unlimited'}</span>
            </div>
            <div className="text-left space-y-1">
              <span className="text-slate-400 block font-semibold">ATTEMPTS REMAINING</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {quiz.max_attempts > 0 ? quiz.max_attempts - attempts.filter((a: any) => a.status === 'SUBMITTED').length : 'Unlimited'}
              </span>
            </div>
          </div>

          {lastAttempt && (
            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl text-xs space-y-2 border">
              <p className="font-bold text-slate-700 dark:text-slate-350">Last Attempt Results</p>
              <div className="flex justify-around">
                <span>Score: <strong className="text-brand-600">{lastAttempt.percentage}%</strong></span>
                <span>Status: <strong className={lastAttempt.passed ? 'text-emerald-600' : 'text-rose-500'}>{lastAttempt.passed ? 'Passed' : 'Failed'}</strong></span>
              </div>
            </div>
          )}

          <Button size="lg" className="w-full max-w-xs" onClick={handleStartQuiz} isLoading={startMutation.isPending}>
            Start Assessment
          </Button>
        </Card>
      </div>
    );
  }

  if (!attemptData || !attemptData.question_attempts) {
    return <div className="text-xs text-slate-400 p-8 text-center">Loading attempt parameters...</div>;
  }

  const activeQA = attemptData.question_attempts[activeQIdx];
  const q = activeQA.question;
  const currentQAData = studentAnswers[activeQA.id] || {};

  // Formatted countdown timer string
  const getTimerString = () => {
    if (timeLeft === null) return '';
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col bg-slate-50 dark:bg-slate-955 ${isDistractionFree ? 'fixed inset-0 z-50 h-screen w-screen p-6' : 'h-full w-full'}`}>
      
      {/* Quiz controls header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-250/60 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDistractionFree(!isDistractionFree)}
            className="p-1.5 border rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Toggle Distraction-free View"
          >
            {isDistractionFree ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{quiz.title}</h3>
            <span className="text-[10px] text-slate-400">Distraction-free focus mode active</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-955/20 text-amber-600 border border-amber-100/30 rounded-full text-xs font-bold font-mono">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>{getTimerString()}</span>
            </div>
          )}
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmitQuiz} isLoading={submitMutation.isPending}>
            Submit Quiz
          </Button>
        </div>
      </div>

      {/* Main split player view */}
      <div className="flex-1 flex overflow-hidden pt-4 gap-6">
        
        {/* Left column question workspace */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          <Card className="p-6 border-slate-200/50 space-y-4 bg-white dark:bg-slate-900 relative">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Question {activeQIdx + 1} of {attemptData.question_attempts.length}</span>
              <button 
                onClick={() => updateAnswer(activeQA.id, { flagged: !currentQAData.flagged })}
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 border rounded ${currentQAData.flagged ? 'text-amber-500 border-amber-200 bg-amber-50/50' : 'text-slate-400'}`}
              >
                <Flag className="h-3 w-3" />
                <span>{currentQAData.flagged ? 'Flagged for Review' : 'Flag Question'}</span>
              </button>
            </div>

            <div className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
              {q.prompt}
            </div>

            {/* Answer Options Selector per Question Type */}
            <div className="pt-4 space-y-3">
              
              {/* MCQ Single / True False */}
              {(q.question_type === 'SINGLE' || q.question_type === 'TF') && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt: any) => (
                    <label 
                      key={opt.id} 
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer hover:bg-slate-50 transition-colors ${currentQAData.selected_option === opt.id ? 'border-brand-500 bg-brand-500/5 font-semibold text-brand-700' : 'border-slate-200'}`}
                    >
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        checked={currentQAData.selected_option === opt.id} 
                        onChange={() => updateAnswer(activeQA.id, { selected_option: opt.id })} 
                        className="text-brand-600 focus:ring-brand-500 h-4 w-4"
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* MCQ Multiple */}
              {q.question_type === 'MULTI' && (
                <div className="flex flex-col gap-2">
                  {q.options.map((opt: any) => {
                    const isChecked = (currentQAData.selected_options || []).includes(opt.id);
                    return (
                      <label 
                        key={opt.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer hover:bg-slate-50 transition-colors ${isChecked ? 'border-brand-500 bg-brand-500/5 font-semibold text-brand-700' : 'border-slate-200'}`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={(e) => {
                            const current = currentQAData.selected_options || [];
                            const next = e.target.checked 
                              ? [...current, opt.id] 
                              : current.filter((id: string) => id !== opt.id);
                            updateAnswer(activeQA.id, { selected_options: next });
                          }} 
                          className="text-brand-600 focus:ring-brand-500 rounded h-4 w-4"
                        />
                        <span>{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Short Answer / Fill in Blank / Prediction */}
              {(q.question_type === 'SHORT' || q.question_type === 'FILL' || q.question_type === 'PREDICT') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">Write Your Answer Here</label>
                  <input
                    type="text"
                    value={currentQAData.text_answer || ''}
                    onChange={(e) => updateAnswer(activeQA.id, { text_answer: e.target.value })}
                    className="w-full text-xs rounded-lg border p-2 bg-white dark:bg-slate-950 focus:border-brand-500 focus:outline-none"
                    placeholder="Type matches precisely (case-insensitive)"
                  />
                </div>
              )}

              {/* Matching */}
              {q.question_type === 'MATCH' && (
                <div className="space-y-4">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Match left terms to right options</span>
                  {q.options.map((opt: any) => (
                    <div key={opt.id} className="grid grid-cols-2 gap-4 items-center bg-slate-50 dark:bg-slate-900/40 p-3 border rounded-xl">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{opt.text}</span>
                      <select
                        value={currentQAData.matching_answer?.[opt.id] || ''}
                        onChange={(e) => {
                          const currentMatch = currentQAData.matching_answer || {};
                          const nextMatch = { ...currentMatch, [opt.id]: e.target.value };
                          updateAnswer(activeQA.id, { matching_answer: nextMatch });
                        }}
                        className="text-xs rounded-lg border p-1 bg-white dark:bg-slate-950 focus:outline-none"
                      >
                        <option value="">Select match</option>
                        {q.options.map((o: any) => (
                          <option key={o.id} value={o.match_text}>{o.match_text}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Ordering */}
              {q.question_type === 'ORDER' && (
                <div className="space-y-4">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Order options sequentially</span>
                  <div className="flex flex-col gap-2">
                    {/* Render select fields for ordering options */}
                    {q.options.map((_opt: any, oIdx: number) => {
                      const selectedVal = currentQAData.ordering_answer?.[oIdx] || '';
                      return (
                        <div key={oIdx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 border rounded-xl">
                          <span className="text-xs font-bold text-slate-500">Position {oIdx + 1}</span>
                          <select
                            value={selectedVal}
                            onChange={(e) => {
                              const currentOrder = [...(currentQAData.ordering_answer || [])];
                              currentOrder[oIdx] = e.target.value;
                              updateAnswer(activeQA.id, { ordering_answer: currentOrder });
                            }}
                            className="flex-1 text-xs rounded-lg border p-1 bg-white dark:bg-slate-950 focus:outline-none"
                          >
                            <option value="">Select option</option>
                            {q.options.map((o: any) => (
                              <option key={o.id} value={o.id}>{o.text}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </Card>

          {/* Navigation Controls footer */}
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setActiveQIdx(Math.max(0, activeQIdx - 1))}
              disabled={activeQIdx === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setActiveQIdx(Math.min(attemptData.question_attempts.length - 1, activeQIdx + 1))}
              disabled={activeQIdx === attemptData.question_attempts.length - 1}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Right column navigation/flags sidebar */}
        <div className="w-56 border-l border-slate-200/50 dark:border-slate-800/40 pl-6 space-y-6 shrink-0 select-none">
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Question Map</span>
            <div className="grid grid-cols-4 gap-2">
              {attemptData.question_attempts.map((qa: any, idx: number) => {
                const isAnswered = studentAnswers[qa.id]?.selected_option || 
                                  (studentAnswers[qa.id]?.selected_options || []).length > 0 ||
                                  studentAnswers[qa.id]?.text_answer ||
                                  Object.keys(studentAnswers[qa.id]?.matching_answer || {}).length > 0;
                
                const isFlagged = studentAnswers[qa.id]?.flagged;
                
                return (
                  <button
                    key={qa.id}
                    onClick={() => setActiveQIdx(idx)}
                    className={`h-9 w-9 text-xs font-bold rounded-lg border flex items-center justify-center transition-all relative
                      ${activeQIdx === idx 
                        ? 'border-brand-500 bg-brand-600 text-white font-extrabold shadow-md' 
                        : isFlagged
                          ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                          : isAnswered
                            ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20'
                            : 'border-slate-200 text-slate-500 bg-white dark:bg-slate-900'
                      }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-amber-500 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 space-y-2 leading-relaxed">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-brand-600 rounded" />
              <span>Current Question</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-emerald-50 border border-emerald-500 rounded" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-amber-50 border border-amber-400 rounded" />
              <span>Flagged for Review</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 bg-white border border-slate-200 rounded" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
