import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { Download, RefreshCw, Search, X } from 'lucide-react';

interface GradebookSpreadsheetProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export const GradebookSpreadsheet: React.FC<GradebookSpreadsheetProps> = ({ courseId, courseTitle, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'INCOMPLETE'>('ALL');

  // 1. Fetch gradebook entries for this course
  const { data: grades = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['course-gradebook', courseId],
    queryFn: async () => {
      const response = await api.get(`gradebook-entries/?course_id=${courseId}`);
      return response.data.results || response.data;
    },
    enabled: !!courseId
  });

  // 2. Recalculate grades mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      await api.post(`gradebook-entries/courses/${courseId}/recalculate/`);
    },
    onSuccess: () => {
      refetch();
      toast.success('Course gradebook recalculated successfully!');
    },
    onError: () => {
      toast.error('Failed to trigger recalculation.');
    }
  });

  // 3. Export CSV handler
  const handleExportCSV = async () => {
    try {
      const response = await api.get(`gradebook-entries/courses/${courseId}/export/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gradebook_${courseId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Gradebook exported as CSV!');
    } catch (err) {
      toast.error('Failed to export CSV.');
    }
  };

  // Search & filter matching
  const filteredGrades = grades.filter((g: any) => {
    const studentName = (g.student_name || '').toLowerCase();
    const studentEmail = (g.student_email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = studentName.includes(query) || studentEmail.includes(query);
    
    if (statusFilter === 'PASSED') return matchesSearch && g.passed;
    if (statusFilter === 'INCOMPLETE') return matchesSearch && !g.passed;
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-955 h-full p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800/40 shadow-2xl flex flex-col justify-between">
        
        <div className="space-y-6">
          
          {/* Header block */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/30">
            <div>
              <h3 className="text-sm font-black text-slate-905 dark:text-white">Instructor Gradebook Spreadsheet</h3>
              <p className="text-[10px] text-slate-400 font-medium">Course: {courseTitle}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Action buttons bar & filters */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students by name or email..."
                className="w-full text-xs rounded-lg border p-2 pl-8 bg-slate-50 dark:bg-slate-950 focus:outline-none"
              />
              <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs rounded-lg border p-2 bg-white dark:bg-slate-950"
              >
                <option value="ALL">All Outcomes</option>
                <option value="PASSED">Passed & Certified</option>
                <option value="INCOMPLETE">Incomplete</option>
              </select>

              <Button size="sm" variant="outline" onClick={() => recalculateMutation.mutate()} isLoading={recalculateMutation.isPending} title="Recalculate Averages">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              <Button size="sm" onClick={handleExportCSV} className="flex items-center gap-1">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>

          </div>

          {/* Spreadsheet Table */}
          {isLoading ? (
            <div className="text-xs text-slate-450 p-8 text-center animate-pulse">Loading course gradebook data...</div>
          ) : filteredGrades.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              No student grade records match your search query.
            </div>
          ) : (
            <Card className="border-slate-200/50 overflow-hidden">
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="px-4 py-3">Student Details</th>
                      <th className="px-4 py-3 text-center">Score %</th>
                      <th className="px-4 py-3 text-center">Grade Letter</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/50">
                    {filteredGrades.map((g: any) => (
                      <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 dark:text-white block">{g.student_name}</span>
                          <span className="text-[9px] text-slate-400 block">{g.student_email}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-black text-slate-700 dark:text-slate-350">{g.overall_score}%</td>
                        <td className="px-4 py-3 text-center font-black text-brand-600 text-xs">{g.grade_letter}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${g.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-705'}`}>
                            {g.passed ? 'Passed' : 'Incomplete'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {new Date(g.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/30 mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">Close Gradebook</Button>
        </div>

      </div>
    </div>
  );
};
