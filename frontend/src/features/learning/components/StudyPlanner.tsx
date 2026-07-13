import React, { useState } from 'react';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Calendar, Clock } from 'lucide-react';
import { toast } from '../../../store/toastStore';

interface ScheduleSlot {
  day: string;
  hours: number;
  activity: string;
}

interface PlannerData {
  weekly_hours: number;
  target_date: string;
  schedule: ScheduleSlot[];
}

export const StudyPlanner: React.FC = () => {
  const [targetHours, setTargetHours] = useState(5);
  const [completionDate, setCompletionDate] = useState('2026-12-31');
  const [planner, setPlanner] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('ai/study-planner/schedule/', {
        target_hours: targetHours,
        completion_date: completionDate
      });
      setPlanner(res.data);
      toast.success("AI study plan generated successfully!");
    } catch (err: any) {
      toast.error("Failed to build study plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 border-slate-200/60 dark:border-slate-800/40 shadow-sm rounded-3xl space-y-6 text-xs">
      <div className="flex items-center gap-2 border-b pb-4 dark:border-slate-850">
        <Calendar className="h-5 w-5 text-brand-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Study Calendar & Planner</h2>
          <p className="text-[10px] text-slate-500">Calculate target slots dynamically to finish your enrolled curriculum by your target date.</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <label className="font-bold text-slate-600 dark:text-slate-400">Weekly Target Hours</label>
          <input
            type="number"
            value={targetHours}
            onChange={(e) => setTargetHours(parseInt(e.target.value) || 1)}
            min={1}
            max={40}
            className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-bold text-slate-600 dark:text-slate-400">Completion Target Date</label>
          <input
            type="date"
            value={completionDate}
            onChange={(e) => setCompletionDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Generating Calendar..." : "Generate AI Plan"}
        </Button>
      </form>

      {planner && (
        <div className="space-y-4 pt-4 border-t dark:border-slate-850">
          <div className="flex justify-between items-center bg-brand-50/50 dark:bg-brand-950/10 p-3 rounded-xl border border-brand-100/50 dark:border-brand-900/30">
            <span className="font-bold text-brand-800 dark:text-brand-400">Estimated Commitment</span>
            <span className="font-black text-slate-900 dark:text-white">{planner.weekly_hours} Hours/week until {planner.target_date}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planner.schedule.map((slot, index) => (
              <Card key={index} className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/40">
                <div className="flex justify-between items-center border-b pb-2 mb-2 dark:border-slate-850">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{slot.day}</span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-350">
                    <Clock className="h-3 w-3" />
                    {slot.hours} hrs
                  </span>
                </div>
                <p className="text-slate-655 font-medium leading-relaxed">{slot.activity}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
