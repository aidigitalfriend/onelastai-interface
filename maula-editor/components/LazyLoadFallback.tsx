import React from 'react';

interface LazyLoadFallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Professional loading fallback for lazy-loaded components
 * Uses the charcoal aurora theme styling
 */
export const LazyLoadFallback: React.FC<LazyLoadFallbackProps> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-16',
    md: 'h-32',
    lg: 'h-48',
  };

  const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} w-full bg-vscode-sidebar/50`}>
      {/* Aurora-styled spinner */}
      <div className="relative">
        <div className={`${spinnerSizes[size]} border-2 border-vscode-border rounded-full animate-spin`}>
          <div className="absolute inset-0 border-2 border-transparent border-t-vscode-accent rounded-full" />
        </div>
        {/* Glow effect */}
        <div 
          className={`absolute inset-0 ${spinnerSizes[size]} rounded-full blur-md opacity-30`}
          style={{ background: 'var(--vscode-accent)' }}
        />
      </div>
      
      {/* Loading text */}
      <span className="mt-3 text-xs text-vscode-textMuted animate-pulse">
        {message}
      </span>
    </div>
  );
};

/**
 * Panel-specific loading fallback with icon
 */
export const PanelLoadingFallback: React.FC<{ 
  panelName: string;
  icon?: React.ReactNode;
}> = ({ panelName, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-vscode-sidebar p-6">
      {/* Icon or default */}
      <div className="mb-4 text-vscode-accent opacity-60">
        {icon || (
          <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )}
      </div>
      
      {/* Spinner */}
      <div className="relative mb-3">
        <div className="w-8 h-8 border-2 border-vscode-border rounded-full">
          <div className="absolute inset-0 border-2 border-transparent border-t-vscode-accent rounded-full animate-spin" />
        </div>
      </div>
      
      {/* Panel name */}
      <span className="text-sm text-vscode-text font-medium mb-1">
        Loading {panelName}
      </span>
      <span className="text-xs text-vscode-textMuted">
        Please wait...
      </span>
      
      {/* Progress bar animation */}
      <div className="w-32 h-1 bg-vscode-border rounded-full mt-4 overflow-hidden">
        <div 
          className="h-full bg-vscode-accent rounded-full animate-pulse"
          style={{
            animation: 'loading-progress 1.5s ease-in-out infinite',
            background: 'linear-gradient(90deg, var(--vscode-accent), var(--vscode-accent-hover))',
          }}
        />
      </div>
      
      <style>{`
        @keyframes loading-progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LazyLoadFallback;
