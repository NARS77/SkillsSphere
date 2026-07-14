import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { toast } from '../../../store/toastStore';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const fillCredentials = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Demo@123', { shouldValidate: true });
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await api.post('auth/login/', data);
      const { user, tokens } = response.data;
      
      setSession(user, tokens.access, tokens.refresh);
      toast.success(`Welcome back, ${user.username || 'user'}!`);
      if (user.role === 'INSTRUCTOR') {
        navigate('/instructor/courses');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8 border-slate-200/50 dark:border-slate-800/40">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
          Welcome back
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your credentials to access your courses
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="name@example.com"
          error={errors.email?.message}
          leftIcon={<Mail className="h-4 w-4" />}
        />

        <div className="relative">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
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

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500/20 border-slate-300 dark:border-slate-800 rounded bg-white dark:bg-slate-950 transition-colors"
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 dark:text-slate-400 font-medium">
              Remember me
            </label>
          </div>

          <div className="text-xs">
            <Link
              to="/forgot-password"
              className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>

      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          Sign up
        </Link>
      </div>

      {import.meta.env.VITE_DEMO_MODE === 'true' && (
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-3 text-left">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">1-Click Auto-Fill Demo Accounts</span>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('student@skillsphere.demo')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200/60 dark:border-slate-850 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 text-[11px] font-bold transition-all text-slate-700 dark:text-slate-350 cursor-pointer"
            >
              <span>🎓 Log in as Student</span>
              <span className="text-[9px] font-mono text-slate-400">student@skillsphere.demo</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('instructor@skillsphere.demo')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200/60 dark:border-slate-850 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 text-[11px] font-bold transition-all text-slate-700 dark:text-slate-355 cursor-pointer"
            >
              <span>🏫 Log in as Instructor</span>
              <span className="text-[9px] font-mono text-slate-400">instructor@skillsphere.demo</span>
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('admin@skillsphere.demo')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200/60 dark:border-slate-850 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 text-[11px] font-bold transition-all text-slate-700 dark:text-slate-355 cursor-pointer"
            >
              <span>🔑 Log in as Admin</span>
              <span className="text-[9px] font-mono text-slate-400">admin@skillsphere.demo</span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
