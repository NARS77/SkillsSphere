import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  UploadCloud,
  Code
} from 'lucide-react';

interface AssignmentWorkspaceProps {
  lessonId: string;
  onComplete: () => void;
}

export const AssignmentWorkspace: React.FC<AssignmentWorkspaceProps> = ({ lessonId, onComplete }) => {
  const [githubUrl, setGithubUrl] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Upload and countdown states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  // 1. Fetch Assignment details
  const { data: assignment, isLoading: isLoadingAssignment } = useQuery({
    queryKey: ['classroom-assignment', lessonId],
    queryFn: async () => {
      const res = await api.get(`assignments/?lesson_id=${lessonId}`);
      const results = res.data.results || res.data;
      if (results.length === 0) throw new Error('Assignment not found');
      return results[0];
    }
  });

  // 2. Fetch student's submissions for this assignment
  const { data: submissions = [], refetch: refetchSubmissions } = useQuery({
    queryKey: ['my-assignment-submissions', assignment?.id],
    queryFn: async () => {
      const res = await api.get(`submissions/?assignment_id=${assignment.id}`);
      return res.data.results || res.data;
    },
    enabled: !!assignment?.id
  });

  const latestSubmission = submissions[0]; // ordered by -submitted_at

  // Enforce due date countdown
  useEffect(() => {
    if (!assignment?.due_date) return;
    
    const updateCountdown = () => {
      const due = new Date(assignment.due_date).getTime();
      const now = Date.now();
      const diff = due - now;
      
      if (diff <= 0) {
        setTimeLeftStr('Passed');
        return;
      }
      
      const days = Math.floor(diff / (86400 * 1000));
      const hours = Math.floor((diff % (86400 * 1000)) / (3600 * 1000));
      const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      
      if (days > 0) {
        setTimeLeftStr(`${days}d ${hours}h remaining`);
      } else {
        setTimeLeftStr(`${hours}h ${mins}m remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [assignment]);

  // Submit assignment mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('github_repo_url', githubUrl);
      formData.append('text_submission', textAnswer);

      // Simulate upload progress
      setUploadProgress(10);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev === null || prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 15;
        });
      }, 100);

      const res = await api.post(`assignments/${assignment.id}/submit/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      return res.data;
    },
    onSuccess: () => {
      setTimeout(() => {
        setUploadProgress(null);
        setSelectedFile(null);
        setGithubUrl('');
        setTextAnswer('');
        refetchSubmissions();
        onComplete();
        toast.success('Assignment submitted successfully!');
      }, 500);
    },
    onError: (err: any) => {
      setUploadProgress(null);
      toast.error(err.response?.data?.error?.message || 'Failed to submit assignment.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !githubUrl.trim() && !textAnswer.trim()) {
      toast.error('Please upload a file, provide a GitHub repository link, or write a response.');
      return;
    }
    submitMutation.mutate();
  };

  if (isLoadingAssignment) return <div className="text-xs text-slate-400 p-8 text-center">Loading assignment details...</div>;
  if (!assignment) return <div className="text-xs text-slate-400 p-8 text-center">Assignment not found.</div>;

  const isGraded = latestSubmission?.status === 'GRADED';
  const isPastDue = timeLeftStr === 'Passed';
  const blockSubmission = isPastDue && assignment.late_submission_rule === 'DENIED';

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-6">
      
      {/* Overview stats header card */}
      <Card className="p-6 border-slate-200/50 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Deadline Countdown</span>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isPastDue ? 'text-rose-500' : 'text-brand-600'}`}>
            <Clock className="h-4 w-4" />
            {timeLeftStr}
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Maximum Score</span>
          <span className="text-xs font-bold text-slate-805 dark:text-slate-300">{assignment.max_score} Points</span>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Grading Status</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border w-fit block
            ${latestSubmission 
              ? isGraded
                ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                : 'text-amber-700 bg-amber-50 border-amber-100'
              : 'text-slate-400 border-slate-200 bg-slate-50'
            }`}
          >
            {latestSubmission 
              ? isGraded ? 'Graded' : 'Pending Grade'
              : 'Not Submitted'
            }
          </span>
        </div>
      </Card>

      {/* Task Instructions */}
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Assignment Tasks & Instructions</h3>
        <Card className="p-6 border-slate-200/50 bg-white dark:bg-slate-900 prose dark:prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">
          {assignment.instructions}
        </Card>
      </div>

      {/* Rubric Criteria Grid */}
      {assignment.rubric && assignment.rubric.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Evaluation Rubric</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignment.rubric.map((item: any, idx: number) => (
              <Card key={idx} className="p-4 border-slate-200/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{item.criteria}</span>
                <span className="text-xs font-extrabold text-brand-600 bg-brand-50 dark:bg-brand-950 px-2 py-1 rounded">
                  {item.points} pts
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Grade Card / feedback */}
      {isGraded && (
        <Card className="p-6 border-emerald-200 bg-emerald-50/15 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-emerald-805 flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
              Submission Graded Successfully
            </h4>
            <span className="text-sm font-extrabold text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-lg">
              Score: {latestSubmission.score} / {assignment.max_score}
            </span>
          </div>
          {latestSubmission.feedback && (
            <div className="text-xs leading-relaxed text-slate-650 bg-white dark:bg-slate-900/50 p-4 border rounded-xl">
              <span className="text-[10px] text-slate-400 block font-bold uppercase mb-1">Feedback from Instructor</span>
              {latestSubmission.feedback}
            </div>
          )}
          {latestSubmission.rubric_scoring && Object.keys(latestSubmission.rubric_scoring).length > 0 && (
            <div className="text-[10px] space-y-2 border-t pt-3">
              <span className="text-[9px] text-slate-400 block font-bold uppercase">Rubric Scoring Details</span>
              {Object.entries(latestSubmission.rubric_scoring).map(([criteria, points]: any) => (
                <div key={criteria} className="flex justify-between text-slate-600">
                  <span>{criteria}</span>
                  <span className="font-bold">{points} pts</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Submission workspace Form */}
      {!blockSubmission && (!latestSubmission || !isGraded) && (
        <Card className="p-6 border-slate-250/70 bg-white dark:bg-slate-900 space-y-6">
          <div className="border-b pb-3 flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-805">
              {latestSubmission ? 'Replace / Update Submission' : 'Submit Workspace Files'}
            </h4>
            {isPastDue && (
              <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">
                Late submission rules apply ({parseFloat(assignment.late_penalty_percentage)}% daily penalty)
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Github url */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5" />
                GitHub Repository Link (optional)
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full text-xs rounded-lg border p-2 bg-white dark:bg-slate-950"
                placeholder="https://github.com/username/project"
              />
            </div>

            {/* Text answer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400">Written Response / Submission Notes (optional)</label>
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={3}
                className="w-full text-xs rounded-lg border p-2 bg-white dark:bg-slate-955"
                placeholder="Write your explanation or code details here..."
              />
            </div>

            {/* File Drag and Drop */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400">Attach Document / Source Code Zip File</label>
              <div 
                className={`p-6 border-2 border-dashed border-slate-300 rounded-xl text-center hover:border-brand-500 transition-colors bg-slate-50/50 cursor-pointer flex flex-col items-center gap-2
                  ${selectedFile ? 'border-brand-500 bg-brand-500/5' : ''}`}
                onClick={() => document.getElementById('assignment-file-input')?.click()}
              >
                <UploadCloud className="h-8 w-8 text-slate-400" />
                <div>
                  <span className="text-xs font-bold block text-slate-700">
                    {selectedFile ? selectedFile.name : 'Click to select or drag and drop file'}
                  </span>
                  <span className="text-[9px] text-slate-400">PDF, ZIP, DOCX, JS, PY (max 10MB)</span>
                </div>
                <input
                  id="assignment-file-input"
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                  <span>Uploading workspace files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border">
                  <div className="h-full bg-brand-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" isLoading={submitMutation.isPending}>
                {latestSubmission ? 'Replace Submission' : 'Submit Assignment'}
              </Button>
            </div>

          </form>
        </Card>
      )}

      {/* Submission history logs */}
      {submissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Submission Logs & History</h3>
          <Card className="p-4 border-slate-200/50 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date Submitted</th>
                    <th className="py-3 px-4">Files / Links</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub: any) => (
                    <tr key={sub.id} className="text-slate-650 hover:bg-slate-50/50">
                      <td className="py-3 px-4">{new Date(sub.submitted_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {sub.file && (
                            <a href={sub.file} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand-600 hover:underline">
                              <FileText className="h-3.5 w-3.5" />
                              <span>Download file</span>
                            </a>
                          )}
                          {sub.github_repo_url && (
                            <a href={sub.github_repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-500 hover:text-slate-900">
                              <Code className="h-3.5 w-3.5" />
                              <span>Repo link</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded
                          ${sub.status === 'GRADED' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {sub.score !== null ? `${sub.score}/${assignment.max_score}` : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
