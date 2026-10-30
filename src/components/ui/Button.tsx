import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101827] active:scale-[0.99]';

    const variantClasses = {
      primary:
        'bg-[#78AFFF] hover:bg-[#60A5FA] active:bg-[#3B82F6] text-[#0A101D] font-bold shadow-sm focus-visible:ring-[#78AFFF]',
      secondary:
        'bg-[#24344A] hover:bg-[#2A3F5B] active:bg-[#1E2E42] border border-[#3B4B60] text-[#F4F7FC] shadow-sm focus-visible:ring-[#78AFFF]',
      destructive:
        'bg-[#F08088] hover:bg-[#E06C75] active:bg-[#DC2626] text-[#0A101D] font-bold shadow-sm focus-visible:ring-[#F08088]',
      outline:
        'bg-transparent hover:bg-[#24344A] active:bg-[#1E2E42] border border-[#3B4B60] text-[#F4F7FC] focus-visible:ring-[#78AFFF]',
      ghost:
        'bg-transparent hover:bg-[#24344A] active:bg-[#1E2E42] text-[#C2CDDC] hover:text-[#F4F7FC] focus-visible:ring-[#78AFFF]',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs space-x-1.5',
      md: 'px-4 py-2 text-xs sm:text-sm space-x-2',
      lg: 'px-5 py-2.5 text-sm space-x-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && (
          <div
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
            role="status"
            aria-label="Loading"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
