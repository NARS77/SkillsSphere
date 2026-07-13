import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { Trash2 } from 'lucide-react';

interface AssignmentBuilderProps {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
}

export const AssignmentBuilder: React.FC<AssignmentBuilderProps> = ({ lessonId, courseId, lessonTitle }) => {
  const [assignmentId, setAssignmentId] = useState<string | null>(null);

  // Form states
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [lateRule, setLateRule] = useState<'ALLOWED' | 'DENIED' | 'PENALIZED'>('ALLOWED');
  const [latePenalty, setLatePenalty] = useState(0.0);
  const [rubric, setRubric] = useState<any[]>([]);

  // Load or create Assignment
  const { data: assData, isLoading } = useQuery({
    queryKey: ['lesson-assignment', lessonId],
    queryFn: async () => {
      const response = await api.get(`assignments/?lesson_id=${lessonId}`);
      const results = response.data.results || response.data;
      if (results && results.length > 0) {
        return results[0];
      }
      
      // Auto-create default
      const createResponse = await api.post('assignments/', {
        course: courseId,
        lesson: lessonId,
        title: lessonTitle,
        instructions: 'Submit your solution code or document here.',
        due_date: new Date(Date.now() + 86400000 * 7).toISOString() // 7 days from now
      });
      return createResponse.data;
    },
    enabled: !!lessonId
  });

  useEffect(() => {
    if (assData) {
      setAssignmentId(assData.id);
      setInstructions(assData.instructions || '');
      setMaxScore(assData.max_score);
      setLateRule(assData.late_submission_rule);
      setLatePenalty(parseFloat(assData.late_penalty_percentage) || 0.0);
      setRubric(assData.rubric || []);
      
      if (assData.due_date) {
        // Format ISO string to datetime-local format: YYYY-MM-DDTHH:MM
        const date = new Date(assData.due_date);
        const formatted = date.toISOString().slice(0, 16);
        setDueDate(formatted);
      }
    }
  }, [assData]);

  // Save Assignment settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!assignmentId) return;
      await api.patch(`assignments/${assignmentId}/`, {
        instructions,
        due_date: new Date(dueDate).toISOString(),
        max_score: maxScore,
        late_submission_rule: lateRule,
        late_penalty_percentage: latePenalty,
        rubric
      });
    },
    onSuccess: () => {
      toast.success('Assignment settings saved!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save assignment details.');
    }
  });

  // Rubric Handlers
  const handleAddCriterion = () => {
    setRubric([...rubric, { criteria: 'New Criteria', points: 10 }]);
  };

  const handleUpdateCriterion = (idx: number, field: string, value: any) => {
    const updated = [...rubric];
    updated[idx] = { ...updated[idx], [field]: value };
    setRubric(updated);
  };

  const handleDeleteCriterion = (idx: number) => {
    setRubric(rubric.filter((_, i) => i !== idx));
  };

  if (isLoading) {
    return <div className="text-xs text-slate-400 p-4">Loading assignment settings...</div>;
  }

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-4 rounded-xl">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Assignment Parameters</h4>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Instructions (Markdown supported)</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={5}
          className="w-full text-xs rounded-lg border p-2 bg-white dark:bg-slate-950 font-mono"
          placeholder="Describe assignment tasks, requirements, code files required, etc."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Due Date</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs rounded-lg border p-2 bg-white dark:bg-slate-950"
          />
        </div>

        <Input
          type="number"
          label="Maximum Score Points"
          value={maxScore}
          onChange={(e) => setMaxScore(parseInt(e.target.value) || 0)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Late Submission Rule</label>
          <select
            value={lateRule}
            onChange={(e) => setLateRule(e.target.value as any)}
            className="text-xs rounded-lg border bg-white dark:bg-slate-950 p-2"
          >
            <option value="ALLOWED">Allow Late Submission</option>
            <option value="DENIED">Deny Late Submission</option>
            <option value="PENALIZED">Penalize Late Submission</option>
          </select>
        </div>

        {lateRule === 'PENALIZED' && (
          <Input
            type="number"
            label="Late Penalty % (Deducted per day late)"
            value={latePenalty}
            onChange={(e) => setLatePenalty(parseFloat(e.target.value) || 0.0)}
          />
        )}
      </div>

      {/* Rubric Criteria Builder */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Grading Rubric</span>
          <button className="text-[10px] font-bold text-brand-600 hover:underline" onClick={handleAddCriterion}>
            + Add Criteria
          </button>
        </div>

        <div className="space-y-2">
          {rubric.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2 rounded-lg border">
              <input
                type="text"
                value={item.criteria}
                onChange={(e) => handleUpdateCriterion(idx, 'criteria', e.target.value)}
                className="flex-1 text-xs bg-transparent border-b focus:outline-none font-bold"
                placeholder="Criteria Title (e.g. Clean Code)"
              />
              <input
                type="number"
                value={item.points}
                onChange={(e) => handleUpdateCriterion(idx, 'points', parseInt(e.target.value) || 0)}
                className="w-20 text-xs bg-transparent border-b focus:outline-none text-brand-600 text-center font-bold"
                placeholder="Points"
              />
              <button className="text-danger-500 hover:text-danger-700" onClick={() => handleDeleteCriterion(idx)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
          Save Assignment Parameters
        </Button>
      </div>
    </div>
  );
};
