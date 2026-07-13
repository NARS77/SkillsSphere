import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { CheckCircle2, AlertTriangle, ArrowRight, Brain } from 'lucide-react';
import { toast } from '../../../store/toastStore';

export const EmailVerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [emailToResend, setEmailToResend] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.get(`auth/email/verify/?token=${token}`);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.response?.data?.error?.message || 'Verification failed. Token may be expired or invalid.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToResend.trim() || resending) return;
    setResending(true);
    try {
      await api.post('auth/email/resend-verification/', { email: emailToResend });
      toast.success('A new verification email has been sent!');
      setEmailToResend('');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md p-8 shadow-2xl border-slate-200/50 bg-white dark:bg-slate-900 rounded-3xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center shadow-md">
            <Brain className="h-6 w-6 text-white" />
          </div>
        </div>

        {status === 'verifying' && (
          <div className="space-y-4 py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent mx-auto"></div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Verifying your email...</h3>
            <p className="text-xs text-slate-500">Please hold on while we verify your activation link.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Email Verified Successfully!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Thank you! Your account is now fully verified and active. You can proceed to sign in and explore the classroom dashboard.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="w-full">
              Sign In
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center rounded-full border border-rose-100 dark:border-rose-900/30">
                <AlertTriangle className="h-10 w-10" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verification Link Problem</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white text-left">Request a new verification link:</h4>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  value={emailToResend}
                  onChange={(e) => setEmailToResend(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="flex-1 px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                />
                <Button type="submit" size="sm" isLoading={resending}>
                  Resend
                </Button>
              </form>
            </div>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs font-bold text-brand-600 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

      </Card>
    </div>
  );
};
