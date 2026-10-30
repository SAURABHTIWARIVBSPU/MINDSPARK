import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'info' | 'destructive' | 'success' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full border';

  const variantClasses = {
    info: 'bg-[#263D59] text-[#78AFFF] border-[#3B4B60]',
    destructive: 'bg-[#3D2428] text-[#F08088] border-[#5A2E33]',
    success: 'bg-[#1C3A2E] text-[#34D399] border-[#235841]',
    warning: 'bg-[#3B2F17] text-[#FBBF24] border-[#59441B]',
    neutral: 'bg-[#24344A] text-[#C2CDDC] border-[#3B4B60]',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] space-x-1',
    md: 'px-2.5 py-0.5 text-xs space-x-1.5',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
