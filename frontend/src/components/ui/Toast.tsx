import React, { useEffect, useRef, useState } from 'react';
import { useToastStore, type ToastMessage } from '../../store/toastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const { message, type, duration = 4000 } = toast;
  const [remaining, setRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const tick = 40; // update progress bar smooth tick rate (25 FPS)
    timerRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= tick) {
          clearInterval(timerRef.current!);
          onClose();
          return 0;
        }
        return prev - tick;
      });
    }, tick);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, onClose]);

  const percentRemaining = (remaining / duration) * 100;

  const typeConfig = {
    success: {
      bg: 'bg-white dark:bg-slate-900 border-emerald-100 dark:border-emerald-950/30 shadow-emerald-500/5',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      progressBg: 'bg-emerald-500',
    },
    error: {
      bg: 'bg-white dark:bg-slate-900 border-rose-100 dark:border-rose-950/30 shadow-rose-500/5',
      icon: <AlertCircle className="h-5 w-5 text-rose-500" />,
      progressBg: 'bg-rose-500',
    },
    info: {
      bg: 'bg-white dark:bg-slate-900 border-brand-100 dark:border-brand-950/30 shadow-brand-500/5',
      icon: <Info className="h-5 w-5 text-brand-500" />,
      progressBg: 'bg-brand-500',
    },
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        pointer-events-auto flex flex-col gap-2.5 p-4 rounded-xl border shadow-lg
        animate-slide-in-right transition-all duration-300 ${typeConfig[type].bg}
      `}
      role="alert"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="flex-shrink-0">{typeConfig[type].icon}</div>
        <div className="flex-1 text-sm font-semibold leading-5 text-slate-800 dark:text-slate-200">
          {message}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg p-0.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Sliding countdown bar indicator */}
      <div className="w-full bg-slate-100 dark:bg-slate-800/60 h-[3px] rounded-full overflow-hidden">
        <div
          className={`h-full ${typeConfig[type].progressBg} transition-all duration-[40ms] ease-linear`}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>
    </div>
  );
};
