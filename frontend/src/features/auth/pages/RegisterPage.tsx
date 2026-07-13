import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, User, UserCheck, GraduationCap, Eye, EyeOff } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { toast } from '../../../store/toastStore';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(150, 'Username must be less than 150 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    role: z.enum(['STUDENT', 'INSTRUCTOR']),
    accept_terms: z.boolean().refine(val => val === true, {
      message: 'You must accept the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationData, setVerificationData] = useState<{ email: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'STUDENT',
      accept_terms: false,
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await api.post('auth/register/', {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        accept_terms: data.accept_terms,
        terms_version: 'v1.0',
        privacy_policy_version: 'v1.0',
      });
      
      setVerificationData({ email: data.email });
      toast.success('Registration initiated! Verification code sent to email.');
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const errorMsg = errorData?.message || 'Registration failed. Please try again.';
      
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

  if (verificationData) {
    const handleVerifyCode = async (e: React.FormEvent) => {
      e.preventDefault();
      if (verificationCode.length !== 6 || isVerifying) return;
      
      setIsVerifying(true);
      try {
        const response = await api.post('auth/register/verify/', {
          email: verificationData.email,
          code: verificationCode,
        });
        const { user, tokens } = response.data;
        
        toast.success('Account verified and created successfully!');
        setSession(user, tokens.access, tokens.refresh);
        if (user.role === 'INSTRUCTOR') {
          navigate('/instructor/courses');
        } else {
          navigate('/dashboard');
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.error?.message || 'Invalid or expired verification code. Please try again.';
        toast.error(errorMsg);
      } finally {
        setIsVerifying(false);
      }
    };

    const handleResendCode = async () => {
      if (isResending) return;
      setIsResending(true);
      try {
        await api.post('auth/email/resend-verification/', { email: verificationData.email });
        toast.success('A new 6-digit verification code has been sent!');
      } catch (err: any) {
        toast.error(err.response?.data?.error?.message || 'Failed to resend verification code.');
      } finally {
        setIsResending(false);
      }
    };

    return (
      <Card className="p-8 border-slate-200/50 dark:border-slate-800/40 animate-fade-in">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
            Verify your account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-light">
            We've sent a 6-digit verification code to <span className="font-semibold text-slate-800 dark:text-slate-200">{verificationData.email}</span>. Please enter it below to complete registration.
          </p>
        </div>

        <form onSubmit={handleVerifyCode} className="space-y-6">
          <Input
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
            type="text"
            label="Verification Code"
            placeholder="123456"
            className="text-center tracking-[12px] font-mono text-xl"
            required
          />

          <Button type="submit" className="w-full" isLoading={isVerifying} disabled={verificationCode.length !== 6}>
            Verify Account
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
          Didn't receive the code?{' '}
          <button
            onClick={handleResendCode}
            disabled={isResending}
            className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 border-slate-200/50 dark:border-slate-800/40 animate-fade-in">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
          Create an account
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Get started with SkillSphere today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Role Selector Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
            I want to join as a:
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setValue('role', 'STUDENT')}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-150 cursor-pointer
                ${
                  selectedRole === 'STUDENT'
                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-750 bg-white dark:bg-slate-950'
                }
              `}
            >
              <GraduationCap className="h-5 w-5" />
              <span className="text-xs font-bold">Student</span>
            </button>

            <button
              type="button"
              onClick={() => setValue('role', 'INSTRUCTOR')}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all duration-150 cursor-pointer
                ${
                  selectedRole === 'INSTRUCTOR'
                    ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-750 bg-white dark:bg-slate-950'
                }
              `}
            >
              <UserCheck className="h-5 w-5" />
              <span className="text-xs font-bold">Instructor</span>
            </button>
          </div>
        </div>

        <Input
          {...register('username')}
          type="text"
          label="Username"
          placeholder="johndoe"
          error={errors.username?.message}
          leftIcon={<User className="h-4 w-4" />}
        />

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

        <Input
          {...register('confirmPassword')}
          type="password"
          label="Confirm Password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          leftIcon={<Lock className="h-4 w-4" />}
        />

        <div className="flex flex-col gap-1.5 py-1">
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('accept_terms')}
              className="mt-0.5 rounded border-slate-200 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer bg-white dark:bg-slate-950 transition-colors"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-medium">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
                Privacy Policy
              </a>.
            </span>
          </label>
          {errors.accept_terms && (
            <p className="text-[11px] font-semibold text-rose-500 mt-1">
              {errors.accept_terms.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </Card>
  );
};
