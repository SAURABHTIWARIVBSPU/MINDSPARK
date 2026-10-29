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
      'inline-flex items-center justify-center font-medium rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]';

    const variantClasses = {
      primary:
        'bg-apple-blue hover:bg-apple-blue-hover active:bg-apple-blue-active text-white shadow-apple-subtle focus-visible:ring-apple-blue',
      secondary:
        'bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 text-slate-700 shadow-apple-subtle focus-visible:ring-apple-blue',
      destructive:
        'bg-apple-red hover:bg-apple-red-hover active:bg-apple-red-active text-white shadow-apple-subtle focus-visible:ring-apple-red',
      outline:
        'bg-transparent hover:bg-slate-50 active:bg-slate-100 border border-slate-200/90 text-slate-700 focus-visible:ring-apple-blue',
      ghost:
        'bg-transparent hover:bg-slate-100 active:bg-slate-200/70 text-slate-700 focus-visible:ring-apple-blue',
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
