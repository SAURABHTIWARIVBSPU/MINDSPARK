import React from 'react';
import { Info, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'destructive' | 'success' | 'warning';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    info: {
      container: 'bg-blue-50/80 border-blue-200/80 text-blue-900',
      icon: <Info className="w-4 h-4 text-apple-blue shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-blue-950',
    },
    destructive: {
      container: 'bg-rose-50/80 border-rose-200/80 text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-apple-red shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-rose-950',
    },
    success: {
      container: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-emerald-950',
    },
    warning: {
      container: 'bg-amber-50/80 border-amber-200/80 text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-amber-950',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl border flex items-start space-x-3 text-xs ${style.container} ${className}`}
      {...props}
    >
      {style.icon}
      <div className="space-y-0.5 flex-1">
        {title && <h4 className={`font-bold ${style.titleColor}`}>{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
