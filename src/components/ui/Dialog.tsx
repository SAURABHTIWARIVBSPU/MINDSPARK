import React from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  children,
  maxWidth = 'lg',
}) => {
  if (!open) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`bg-[#24344A] text-[#F4F7FC] rounded-2xl w-full shadow-2xl border border-[#3B4B60] flex flex-col max-h-[88vh] overflow-hidden ${maxWidthClasses[maxWidth]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{
  title: string;
  description?: string;
  onClose?: () => void;
}> = ({ title, description, onClose }) => (
  <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-[#3B4B60] flex items-start justify-between bg-[#1C2A3D]">
    <div className="space-y-0.5 pr-4">
      <h3 className="text-base font-bold text-[#F4F7FC] tracking-tight">{title}</h3>
      {description && <p className="text-xs text-[#A7B5C8]">{description}</p>}
    </div>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="p-1.5 text-[#A7B5C8] hover:text-[#F4F7FC] hover:bg-[#3B4B60]/50 rounded-full transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

export const DialogBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-[#F4F7FC] ${className}`} {...props}>
    {children}
  </div>
);

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`px-5 py-3.5 sm:px-6 sm:py-4 border-t border-[#3B4B60] bg-[#1C2A3D] flex items-center justify-end space-x-2 ${className}`}
    {...props}
  >
    {children}
  </div>
);
