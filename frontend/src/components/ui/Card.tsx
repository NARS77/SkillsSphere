import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  glass = false,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        rounded-xl border border-slate-200/60 dark:border-slate-800/40 p-6
        bg-white dark:bg-slate-900/50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]
        ${hoverable ? 'hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-150 ease-in-out cursor-pointer active:scale-[0.99]' : 'transition-all duration-150'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
