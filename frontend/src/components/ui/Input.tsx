import React, { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 group">
        {label && (
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-350 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors duration-150">
            {label}
          </label>
        )}
        <div className="relative rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 transition-colors duration-150 group-focus-within:text-indigo-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full block rounded-lg text-sm transition-all duration-150
              bg-white dark:bg-slate-950 border
              placeholder:text-slate-400 dark:placeholder:text-slate-650
              focus:ring-2 focus:ring-offset-0 focus:outline-none
              ${leftIcon ? 'pl-10' : 'pl-3'}
              ${rightIcon ? 'pr-10' : 'pr-3'}
              ${
                error
                  ? 'border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-rose-500/10'
                  : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-indigo-500/10'
              }
              py-2
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5" id={`${props.name}-error`}>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-light">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
