import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#C2CDDC] tracking-tight"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`w-full bg-[#101827] border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#F4F7FC] placeholder:text-[#A7B5C8] shadow-sm transition-all disabled:bg-[#1C2A3D] disabled:text-[#A7B5C8]/50 disabled:cursor-not-allowed focus:outline-none ${
            error
              ? 'border-[#F08088] focus:ring-2 focus:ring-[#F08088]/30 focus:border-[#F08088]'
              : 'border-[#3B4B60] focus:ring-2 focus:ring-[#78AFFF]/30 focus:border-[#78AFFF]'
          } ${className}`}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[#F08088] font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-[11px] text-[#A7B5C8]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
