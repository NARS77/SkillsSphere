import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Lock, CheckCircle2, ArrowRight, Brain, Eye, EyeOff } from 'lucide-react';
import { toast } from '../../../store/toastStore';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!token) {
      toast.error('Reset token is missing in the URL.');
      return;
    }
    
    setIsLoading(true);
    try {
      await api.post('auth/password/reset-confirm/', {
        token: token,
        password: data.password,
      });
      setStatus('success');
      toast.success('Password changed successfully!');
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMsg = errorData?.message || 'Failed to reset password. Token may be expired or invalid.';
      
      if (errorData?.details) {
        Object.entries(errorData.details).forEach(([key, value]) => {
          const message = Array.isArray(value) ? value[0] : value;
          setError(key as any, {
            type: 'server',
            message: String(message),
          });
        });
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md p-8 border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900 rounded-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-850 text-indigo-650 dark:text-indigo-400">
              <Brain className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Choose new password</h2>
          <p className="text-xs text-slate-500 dark:text-slate-405 font-light">Please enter and confirm your secure password below.</p>
        </div>

        {status === 'form' ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                label="New Password"
                placeholder="••••••••"
                error={errors.password?.message}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            <Input
              {...register('confirmPassword')}
              type="password"
              label="Confirm New Password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              leftIcon={<Lock className="h-4 w-4" />}
            />

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        ) : (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Password Updated!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-light">
                Your password has been successfully reset. You can now use your new password to sign in.
              </p>
            </div>
            <Button onClick={() => navigate('/login')} className="w-full">
              Sign In
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        )}

        <div className="text-center pt-2">
          <Link to="/login" className="text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
};
