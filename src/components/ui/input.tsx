"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(10,13,19,0.96),rgba(5,7,11,0.98))] px-4 py-3 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)] outline-none transition-all duration-200 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] focus:border-[rgba(122,162,255,0.3)] focus:ring-2 focus:ring-[rgba(122,162,255,0.14)] focus:shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(122,162,255,0.14)] disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-[rgba(255,123,114,0.4)] focus:border-[rgba(255,123,114,0.52)] focus:ring-[rgba(255,123,114,0.14)]" : ""} ${className}`}
          data-agent-role="input"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="text-[12px] text-[#ffb4ae]">{error}</p>}
        {hint && !error && <p className="text-[12px] text-[var(--color-text-quaternary)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(10,13,19,0.96),rgba(5,7,11,0.98))] px-4 py-3 text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)] outline-none transition-all duration-200 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] focus:border-[rgba(122,162,255,0.3)] focus:ring-2 focus:ring-[rgba(122,162,255,0.14)] focus:shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.03),0_0_28px_rgba(122,162,255,0.14)] disabled:opacity-50 resize-y min-h-[96px] ${error ? "border-[rgba(255,123,114,0.4)] focus:border-[rgba(255,123,114,0.52)] focus:ring-[rgba(255,123,114,0.14)]" : ""} ${className}`}
          data-agent-role="textarea"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="text-[12px] text-[#ffb4ae]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
