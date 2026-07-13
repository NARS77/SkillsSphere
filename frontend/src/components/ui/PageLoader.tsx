import React from 'react';

interface PageLoaderProps {
  message?: string;
  fullscreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = "Loading...", 
  fullscreen = true 
}) => {
  return (
    <div className={`
      flex flex-col items-center justify-center z-50 transition-all duration-300
      ${fullscreen ? 'fixed inset-0 bg-slate-50/70 dark:bg-slate-950/70 backdrop-blur-md' : 'w-full py-12'}
    `}>
      <div className="flex flex-col items-center gap-3">
        {/* Pulsing Branded Logo Container */}
        <div className="animate-branded-pulse relative mb-2">
          <img 
            src="/favicon.png" 
            alt="SkillSphere Loader Icon" 
            className="h-16 w-auto" 
          />
        </div>

        {/* Dynamic Contextual Loading Message */}
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide mt-2 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};
