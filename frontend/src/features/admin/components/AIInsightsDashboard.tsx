import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { BarChart3, Cpu } from 'lucide-react';

export const AIInsightsDashboard: React.FC = () => {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['admin-ai-usage'],
    queryFn: async () => {
      const res = await api.get('ai/analytics/usage/');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 font-medium text-xs">
        <Cpu className="h-5 w-5 animate-spin mr-2" />
        Loading AI Usage metrics...
      </div>
    );
  }

  const promptPercent = usage?.total_tokens > 0 
    ? Math.round((usage.prompt_tokens / usage.total_tokens) * 100)
    : 50;

  const completionPercent = 100 - promptPercent;

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-center gap-2 border-b pb-4 dark:border-slate-800">
        <BarChart3 className="h-5 w-5 text-brand-600" />
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Gateway Insights & Usage Metrics</h2>
          <p className="text-[10px] text-slate-500">Track token counts, billing estimates, and credit limits across providers.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-5 space-y-1 bg-white dark:bg-slate-900 border-slate-200/50 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Request Count</span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">{usage?.total_requests || 0}</h3>
          <p className="text-[9px] text-slate-450 font-medium">Valid daily requests routed to adapters</p>
        </Card>

        <Card className="p-5 space-y-1 bg-white dark:bg-slate-900 border-slate-200/50 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Tokens Processed</span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">{(usage?.total_tokens || 0).toLocaleString()}</h3>
          <p className="text-[9px] text-slate-450 font-medium">Prompt + completion tokens counts</p>
        </Card>

        <Card className="p-5 space-y-1 bg-white dark:bg-slate-900 border-slate-200/50 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estimated Costs</span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">${usage?.estimated_cost ? usage.estimated_cost.toFixed(4) : '0.0000'}</h3>
          <p className="text-[9px] text-slate-450 font-medium">Based on $0.000002 cost-per-token</p>
        </Card>

        <Card className="p-5 space-y-1 bg-white dark:bg-slate-900 border-slate-200/50 shadow-sm">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Adapters</span>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white">Gemini / Mock</h3>
          <p className="text-[9px] text-slate-450 font-medium">Multi-provider abstraction ready</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Token Distribution Chart Graphic */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Token Count Distribution</h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>Prompt Input Tokens</span>
                <span>{usage?.prompt_tokens?.toLocaleString() || 0} ({promptPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-600 h-full transition-all duration-500" 
                  style={{ width: `${promptPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>Completion Response Tokens</span>
                <span>{usage?.completion_tokens?.toLocaleString() || 0} ({completionPercent}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-accent-500 h-full transition-all duration-500" 
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Quotas & Guardrails config summary */}
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">AI Gateway Quotas & Limits</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b dark:border-slate-800/80">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Daily Requests Limit (Student)</span>
              <span className="font-black text-slate-900 dark:text-white">50 requests / day</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-slate-800/80">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Prompt rate limiting throttle</span>
              <span className="font-black text-slate-900 dark:text-white">5 requests / minute</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Input Character Validation Limit</span>
              <span className="font-black text-slate-900 dark:text-white">2,000 characters / prompt</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
