import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { api } from '../../../services/api';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      await api.post('auth/password/reset-request/', {
        email: data.email,
      });
      setIsSent(true);
      toast.success(`Reset link sent to ${data.email}!`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to request password reset.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8 border-slate-200/50 dark:border-slate-800/40">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
          Reset your password
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-light">
          We will send you a link to reset your account password
        </p>
      </div>

      {!isSent ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...register('email')}
            type="email"
            label="Email Address"
            placeholder="name@example.com"
            error={errors.email?.message}
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Send Reset Link
          </Button>
        </form>
      ) : (
        <div className="text-center space-y-4 py-4">
          <div className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed font-light">
            Please check your email inbox. We have sent a recovery link to help you choose a new password.
          </div>
          <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </Card>
  );
};
