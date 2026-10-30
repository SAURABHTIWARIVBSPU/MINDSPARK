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
      container: 'bg-[#263D59]/60 border-[#3B4B60] text-[#C2CDDC]',
      icon: <Info className="w-4 h-4 text-[#78AFFF] shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#F4F7FC]',
    },
    destructive: {
      container: 'bg-[#3D2428]/80 border-[#5A2E33] text-[#F08088]',
      icon: <AlertCircle className="w-4 h-4 text-[#F08088] shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#F4F7FC]',
    },
    success: {
      container: 'bg-[#1C3A2E]/80 border-[#235841] text-[#34D399]',
      icon: <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#F4F7FC]',
    },
    warning: {
      container: 'bg-[#3B2F17]/80 border-[#59441B] text-[#FBBF24]',
      icon: <AlertTriangle className="w-4 h-4 text-[#FBBF24] shrink-0 mt-0.5" aria-hidden="true" />,
      titleColor: 'text-[#F4F7FC]',
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
