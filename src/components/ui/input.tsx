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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-none border-2 border-[#0a0a0a] bg-white px-3 py-2.5 font-mono text-[13px] text-[#0a0a0a] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-150 focus:border-[#e5005a] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-[rgba(213,61,90,0.6)] focus:border-[var(--color-error)]" : ""} ${className}`}
          data-agent-role="input"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-error)]">{error}</p>}
        {hint && !error && (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">
            <span className="mr-1 opacity-40" aria-hidden="true">&gt;</span>
            {hint}
          </p>
        )}
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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`min-h-[96px] w-full resize-y rounded-none border-2 border-[#0a0a0a] bg-white px-3 py-2.5 font-mono text-[13px] text-[#0a0a0a] placeholder:text-[var(--color-text-tertiary)] outline-none transition-all duration-150 focus:border-[#e5005a] focus:ring-0 disabled:opacity-50 ${error ? "border-[rgba(213,61,90,0.6)] focus:border-[var(--color-error)]" : ""} ${className}`}
          data-agent-role="textarea"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
