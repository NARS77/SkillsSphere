import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { 
  Settings, ShieldAlert, BarChart3, Ticket, 
  Plus, Check, Search, Activity, Lock, Sparkles
} from 'lucide-react';
import { AIInsightsDashboard } from '../components/AIInsightsDashboard';

export const AdminConsolePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'settings' | 'audit' | 'coupons' | 'health' | 'security' | 'ai'>('analytics');

  // 1. Fetch Admin General Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // In production we would have a dedicated admin/stats endpoint.
      // Here we can aggregate courses, payouts, orders.
      const coursesRes = await api.get('courses/');
      const ordersRes = await api.get('orders/orders/');
      
      const orders = ordersRes.data.results || ordersRes.data;
      const totalRevenue = orders
        .filter((o: any) => o.status === 'PAID')
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

      return {
        total_courses: coursesRes.data.results?.length || 0,
        total_orders: orders.length,
        revenue: totalRevenue,
        active_users: 124 // Mock active users count
      };
    }
  });

  // 2. Fetch Audit Logs
  const [auditSearch, setAuditSearch] = useState('');
  const { data: logs = [] } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get('audit-logs/');
      return res.data.results || res.data;
    }
  });

  // 3. Fetch Coupons
  const { data: coupons = [], refetch: refetchCoupons } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await api.get('coupons/');
      return res.data.results || res.data;
    }
  });

  // 4. Create Coupon Mutation
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponExpiry, setNewCouponExpiry] = useState('');
  const [newCouponMaxUses, setNewCouponMaxUses] = useState(100);

  const createCouponMutation = useMutation({
    mutationFn: async () => {
      const expiry = newCouponExpiry || new Date(Date.now() + 10 * 86400000).toISOString();
      await api.post('coupons/', {
        code: newCouponCode.toUpperCase(),
        coupon_type: newCouponType,
        value: newCouponValue,
        expiry_date: expiry,
        max_uses: newCouponMaxUses
      });
    },
    onSuccess: () => {
      toast.success('Coupon created successfully!');
      refetchCoupons();
      setNewCouponCode('');
    },
    onError: () => {
      toast.error('Failed to create coupon.');
    }
  });

  // 5. Fetch Platform Settings
  const { refetch: refetchSettings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('settings/');
      return res.data.results || res.data;
    }
  });

  // 6. Update Platform Settings Mutation
  const [brandingText, setBrandingText] = useState('Welcome to SkillSphere!');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      await api.post('settings/', { key: 'branding_announcement', value: { value: brandingText } });
      await api.post('settings/', { key: 'maintenance_mode', value: { value: maintenanceMode } });
    },
    onSuccess: () => {
      toast.success('Platform settings updated successfully!');
      refetchSettings();
    },
    onError: () => {
      toast.error('Failed to update settings.');
    }
  });

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Admin Console</h1>
          <p className="text-xs text-slate-500">Manage the core parameters, commerce tokens, audit records, and analytics of SkillSphere.</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b text-sm font-semibold gap-4 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'analytics' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'coupons' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <Ticket className="h-4 w-4" />
          Coupons
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'settings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <Settings className="h-4 w-4" />
          Platform Settings
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'audit' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <ShieldAlert className="h-4 w-4" />
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'health' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <Activity className="h-4 w-4" />
          System Health & Flags
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'security' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <Lock className="h-4 w-4" />
          Security Hardening
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-1.5 py-2.5 px-1 border-b-2 ${activeTab === 'ai' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
        >
          <Sparkles className="h-4 w-4" />
          AI Gateway Insights
        </button>
      </div>

      {/* Content panel */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">${stats?.revenue ? stats.revenue.toFixed(2) : '0.00'}</h3>
            </Card>
            <Card className="p-6 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Courses</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats?.total_courses || 0}</h3>
            </Card>
            <Card className="p-6 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Completed Orders</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats?.total_orders || 0}</h3>
            </Card>
            <Card className="p-6 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Users</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats?.active_users || 0}</h3>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Platform Growth Trends</h2>
            <div className="h-48 w-full bg-slate-50 dark:bg-slate-950/40 rounded-2xl flex items-center justify-center text-xs text-slate-400">
              [Visual Chart Placeholder - Rendered with Sleek HSL Bar Graphics]
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Create New Coupon</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Coupon Code</label>
                <Input
                  placeholder="e.g. SUMMER20"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Discount Type</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="w-full text-xs rounded-xl border p-2 bg-white dark:bg-slate-950 focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed ($)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Value</label>
                  <Input
                    type="number"
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Max Uses</label>
                  <Input
                    type="number"
                    value={newCouponMaxUses}
                    onChange={(e) => setNewCouponMaxUses(parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                  <Input
                    type="datetime-local"
                    value={newCouponExpiry}
                    onChange={(e) => setNewCouponExpiry(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full flex items-center justify-center gap-1.5"
                onClick={() => createCouponMutation.mutate()}
                isLoading={createCouponMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                Generate Coupon
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-2 p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Promo Tokens</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="py-2.5 font-bold">Code</th>
                    <th className="py-2.5 font-bold">Type</th>
                    <th className="py-2.5 font-bold">Value</th>
                    <th className="py-2.5 font-bold">Uses Status</th>
                    <th className="py-2.5 font-bold">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c: any) => (
                    <tr key={c.id} className="border-b text-slate-650 hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">{c.code}</td>
                      <td className="py-2.5 capitalize">{c.coupon_type?.toLowerCase()}</td>
                      <td className="py-2.5 font-semibold">
                        {c.coupon_type === 'PERCENTAGE' ? `${c.value}%` : `$${c.value}`}
                      </td>
                      <td className="py-2.5">{c.uses_count} / {c.max_uses}</td>
                      <td className="py-2.5">{new Date(c.expiry_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">No active coupons.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <Card className="max-w-2xl p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">Global Settings</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Branding Announcement Banner</label>
              <Input
                placeholder="Show notice globally to all logged-in students"
                value={brandingText}
                onChange={(e) => setBrandingText(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 border rounded-2xl">
              <input
                type="checkbox"
                id="maintenance"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-4 w-4 text-brand-600 rounded focus:ring-0"
              />
              <div>
                <label htmlFor="maintenance" className="text-xs font-bold text-slate-900 dark:text-white">Enable Maintenance Window</label>
                <p className="text-[10px] text-slate-500">Limits platform updates. Prevents course catalogs and enrollment purchases.</p>
              </div>
            </div>

            <Button
              onClick={() => updateSettingsMutation.mutate()}
              isLoading={updateSettingsMutation.isPending}
              className="flex items-center justify-center gap-1 text-xs"
            >
              <Check className="h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Platform System Activity Log</h2>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="pl-9 text-xs py-1.5"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-slate-400">
                  <th className="py-2.5 font-bold">Timestamp</th>
                  <th className="py-2.5 font-bold">Actor</th>
                  <th className="py-2.5 font-bold">Action</th>
                  <th className="py-2.5 font-bold">Metadata Details</th>
                </tr>
              </thead>
              <tbody>
                {logs
                  .filter((log: any) => 
                    log.action?.toLowerCase().includes(auditSearch.toLowerCase()) || 
                    log.actor_name?.toLowerCase().includes(auditSearch.toLowerCase())
                  )
                  .map((log: any) => (
                    <tr key={log.id} className="border-b text-slate-650 hover:bg-slate-50/50">
                      <td className="py-2.5 whitespace-nowrap text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {log.actor_name || 'System'}
                      </td>
                      <td className="py-2.5">
                        <span className="bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded text-[10px] font-mono text-slate-600">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 font-mono text-[10px] max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">No logs matching query.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'health' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</h3>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">All Systems Healthy</span>
              </div>
            </Card>

            <Card className="p-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Memory Allocation</h3>
              <p className="text-xl font-black text-slate-850 dark:text-white">124.6 MB</p>
            </Card>

            <Card className="p-6 space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cache Layer</h3>
              <p className="text-xs text-slate-700 dark:text-slate-350 font-medium">Django Local Memory Cache Active</p>
            </Card>
          </div>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Database Feature Flags</h3>
            <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800/40">
              <div className="flex justify-between items-center py-2 text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">enable_mock_payments</p>
                  <p className="text-[10px] text-slate-450">Enables mock checkout payments processing logs.</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full text-[10px] font-bold">Enabled</span>
              </div>
              <div className="flex justify-between items-center py-2 text-xs">
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">enable_ai_summary</p>
                  <p className="text-[10px] text-slate-450">Toggles AI automated outline summaries on course creation.</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full text-[10px] font-bold">Enabled</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6 text-xs">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Lock className="h-4.5 w-4.5 text-brand-600" />
              Two-Factor Authentication (2FA) Setup
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Enable two-factor authentication to secure your platform dashboard access. SkillSphere supports mock TOTP tokens.
            </p>
            <Button size="sm">Configure 2FA Auth</Button>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Login Audits</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="py-2.5 font-bold">IP Address</th>
                    <th className="py-2.5 font-bold">Device User Agent</th>
                    <th className="py-2.5 font-bold">Logged In At</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b text-slate-655 hover:bg-slate-50/50">
                    <td className="py-2.5 font-semibold">127.0.0.1 (Local)</td>
                    <td className="py-2.5 font-mono text-[10px]">Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0</td>
                    <td className="py-2.5">{new Date().toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ai' && (
        <AIInsightsDashboard />
      )}
    </div>
  );
};
