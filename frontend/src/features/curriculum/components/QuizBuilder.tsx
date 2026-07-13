import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { Plus, Trash2, Check } from 'lucide-react';

interface QuizBuilderProps {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
}

export const QuizBuilder: React.FC<QuizBuilderProps> = ({ lessonId, courseId, lessonTitle }) => {
  const [quizId, setQuizId] = useState<string | null>(null);

  // Quiz config state
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [passingPct, setPassingPct] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [randomizeQs, setRandomizeQs] = useState(false);
  const [randomizeAns, setRandomizeAns] = useState(false);
  const [negMarking, setNegMarking] = useState(false);
  const [reqPassing, setReqPassing] = useState(false);

  // Questions list state
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number | null>(null);

  // Load or create Quiz for this lesson
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['lesson-quiz', lessonId],
    queryFn: async () => {
      const response = await api.get(`quizzes/?lesson_id=${lessonId}`);
      const results = response.data.results || response.data;
      if (results && results.length > 0) {
        return results[0];
      }
      
      // Auto-create a default quiz if none exists
      const createResponse = await api.post('quizzes/', {
        course: courseId,
        lesson: lessonId,
        title: lessonTitle,
        description: 'Practice quiz assessment.',
        status: 'PUBLISHED'
      });
      return createResponse.data;
    },
    enabled: !!lessonId
  });

  useEffect(() => {
    if (quizData) {
      setQuizId(quizData.id);
      setDescription(quizData.description || '');
      setInstructions(quizData.instructions || '');
      setPassingPct(quizData.passing_percentage);
      setMaxAttempts(quizData.max_attempts);
      setTimeLimit(quizData.time_limit);
      setRandomizeQs(quizData.randomize_questions);
      setRandomizeAns(quizData.randomize_answer_order);
      setNegMarking(quizData.negative_marking);
      setReqPassing(quizData.require_passing);

      // Load quiz questions
      api.get(`questions/?quiz=${quizData.id}`).then((res) => {
        setQuestions(res.data.results || res.data);
      });
    }
  }, [quizData]);

  // Save Quiz settings mutation
  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quizId) return;
      await api.patch(`quizzes/${quizId}/`, {
        description,
        instructions,
        passing_percentage: passingPct,
        max_attempts: maxAttempts,
        time_limit: timeLimit,
        randomize_questions: randomizeQs,
        randomize_answer_order: randomizeAns,
        negative_marking: negMarking,
        require_passing: reqPassing,
        status: 'PUBLISHED'
      });
    },
    onSuccess: () => {
      toast.success('Quiz settings saved!');
    }
  });

  // Question editing handlers
  const handleAddQuestion = async () => {
    if (!quizId) return;
    try {
      const response = await api.post('questions/', {
        quiz: quizId,
        prompt: 'New Question Prompt',
        question_type: 'SINGLE',
        explanation: '',
        weight: 1.0,
        order: questions.length
      });
      const newQ = response.data;
      setQuestions([...questions, newQ]);
      setActiveQuestionIdx(questions.length);
      toast.success('Question added!');
    } catch (err) {
      toast.error('Failed to add question.');
    }
  };

  const handleDeleteQuestion = async (qId: string, idx: number) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`questions/${qId}/`);
      setQuestions(questions.filter((_, i) => i !== idx));
      if (activeQuestionIdx === idx) setActiveQuestionIdx(null);
      toast.success('Question deleted.');
    } catch (err) {
      toast.error('Failed to delete question.');
    }
  };

  const handleUpdateQuestionField = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const handleSaveQuestion = async (idx: number) => {
    const q = questions[idx];
    try {
      await api.patch(`questions/${q.id}/`, {
        prompt: q.prompt,
        question_type: q.question_type,
        explanation: q.explanation,
        weight: q.weight,
        difficulty: q.difficulty || 'MEDIUM',
        partial_credit: q.partial_credit || false
      });
      toast.success('Question prompt saved!');
    } catch (err) {
      toast.error('Failed to save question.');
    }
  };

  // Answer Option Handlers
  const handleAddOption = async (qIdx: number) => {
    const q = questions[qIdx];
    try {
      const response = await api.post('options/', {
        question: q.id,
        text: 'New Option',
        is_correct: false
      });
      const updated = [...questions];
      updated[qIdx].options = [...(q.options || []), response.data];
      setQuestions(updated);
      toast.success('Answer option added.');
    } catch (err) {
      toast.error('Failed to add option.');
    }
  };

  const handleDeleteOption = async (qIdx: number, optId: string, optIdx: number) => {
    try {
      await api.delete(`options/${optId}/`);
      const updated = [...questions];
      updated[qIdx].options = updated[qIdx].options.filter((_: any, i: number) => i !== optIdx);
      setQuestions(updated);
      toast.success('Option removed.');
    } catch (err) {
      toast.error('Failed to delete option.');
    }
  };

  const handleUpdateOption = async (qIdx: number, optIdx: number, field: string, value: any) => {
    const q = questions[qIdx];
    const opt = q.options[optIdx];
    const payload = { [field]: value };
    
    try {
      const res = await api.patch(`options/${opt.id}/`, payload);
      const updated = [...questions];
      updated[qIdx].options[optIdx] = res.data;
      setQuestions(updated);
    } catch (err) {
      toast.error('Failed to update option.');
    }
  };

  if (isLoading) {
    return <div className="text-xs text-slate-400 p-4">Loading quiz settings...</div>;
  }

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200">Quiz Settings Configuration</h4>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className="w-full text-xs rounded-lg border p-2 bg-white dark:bg-slate-950"
            placeholder="e.g. Answer all questions. Maximum score requires passing threshold."
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            type="number"
            label="Passing Percentage (%)"
            value={passingPct}
            onChange={(e) => setPassingPct(parseInt(e.target.value) || 0)}
          />
          <Input
            type="number"
            label="Max Attempts (0 = unlimited)"
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 0)}
          />
          <Input
            type="number"
            label="Time Limit (minutes)"
            value={timeLimit}
            onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={randomizeQs} onChange={(e) => setRandomizeQs(e.target.checked)} />
            <span>Randomize Questions</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={randomizeAns} onChange={(e) => setRandomizeAns(e.target.checked)} />
            <span>Randomize Answer Options</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={negMarking} onChange={(e) => setNegMarking(e.target.checked)} />
            <span>Negative Marking (-25%)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={reqPassing} onChange={(e) => setReqPassing(e.target.checked)} />
            <span>Lock next section until passed</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={() => saveQuizMutation.mutate()} isLoading={saveQuizMutation.isPending}>
            Save Quiz Settings
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Question List ({questions.length})</h4>
          <Button size="sm" variant="outline" onClick={handleAddQuestion}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Question
          </Button>
        </div>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={q.id} className="border-slate-200/60 p-4 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs font-extrabold text-brand-600 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded">
                  Q{idx + 1} ({q.question_type})
                </span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="p-1.5" onClick={() => handleSaveQuestion(idx)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="p-1.5 text-danger-500" onClick={() => handleDeleteQuestion(q.id, idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <textarea
                  value={q.prompt}
                  onChange={(e) => handleUpdateQuestionField(idx, 'prompt', e.target.value)}
                  className="w-full text-xs rounded-lg border p-2 bg-white dark:bg-slate-950 font-bold"
                  placeholder="Question text/prompt"
                  rows={2}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400">Type</label>
                    <select
                      value={q.question_type}
                      onChange={(e) => handleUpdateQuestionField(idx, 'question_type', e.target.value)}
                      className="text-xs rounded-lg border p-1 bg-white dark:bg-slate-955"
                    >
                      <option value="SINGLE">MCQ (Single Answer)</option>
                      <option value="MULTI">MCQ (Multiple Answers)</option>
                      <option value="TF">True / False</option>
                      <option value="SHORT">Short Answer</option>
                      <option value="FILL">Fill in the Blank</option>
                      <option value="MATCH">Matching</option>
                      <option value="ORDER">Ordering</option>
                      <option value="PREDICT">Code Prediction</option>
                    </select>
                  </div>
                  <Input
                    type="number"
                    label="Weight / Marks"
                    value={q.weight}
                    onChange={(e) => handleUpdateQuestionField(idx, 'weight', parseFloat(e.target.value) || 1.0)}
                  />
                </div>

                {/* Explanation text */}
                <textarea
                  value={q.explanation || ''}
                  onChange={(e) => handleUpdateQuestionField(idx, 'explanation', e.target.value)}
                  className="w-full text-xs rounded-lg border p-2 bg-slate-50/50 dark:bg-slate-900/20"
                  placeholder="Answer explanation (displayed after student submits)"
                  rows={1.5}
                />

                {/* Answer Options Editor (Not for simple text inputs like SHORT/FILL unless configuring correct matches) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Answer Options</span>
                    <button className="text-[10px] font-bold text-brand-600 hover:underline" onClick={() => handleAddOption(idx)}>
                      + Add Option
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(q.options || []).map((opt: any, optIdx: number) => (
                      <div key={opt.id} className="flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded-lg border border-slate-200/50">
                        <input
                          type="checkbox"
                          checked={opt.is_correct}
                          onChange={(e) => handleUpdateOption(idx, optIdx, 'is_correct', e.target.checked)}
                          title="Is correct option?"
                        />
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdateOption(idx, optIdx, 'text', e.target.value)}
                          className="flex-1 text-xs bg-transparent border-b focus:outline-none"
                          placeholder="Option text / Correct text match"
                        />
                        {q.question_type === 'MATCH' && (
                          <input
                            type="text"
                            value={opt.match_text || ''}
                            onChange={(e) => handleUpdateOption(idx, optIdx, 'match_text', e.target.value)}
                            className="w-1/3 text-xs bg-transparent border-b focus:outline-none text-purple-650"
                            placeholder="Right side matching"
                          />
                        )}
                        {q.question_type === 'ORDER' && (
                          <input
                            type="number"
                            value={opt.order}
                            onChange={(e) => handleUpdateOption(idx, optIdx, 'order', parseInt(e.target.value) || 0)}
                            className="w-16 text-xs bg-transparent border-b focus:outline-none text-brand-600 text-center"
                            title="Sequence index"
                          />
                        )}
                        <button className="text-danger-500 hover:text-danger-700" onClick={() => handleDeleteOption(idx, opt.id, optIdx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
