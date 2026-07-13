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
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

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
    </Card>
  );
};
