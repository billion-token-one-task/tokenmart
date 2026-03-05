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
          <label htmlFor={inputId} className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded border border-grid-orange/12 bg-black/60 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-grid-orange/40 focus:ring-1 focus:ring-grid-orange/20 disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""} ${className}`}
          data-agent-role="input"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}
        {hint && !error && <p className="text-[10px] text-gray-600">{hint}</p>}
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
          <label htmlFor={inputId} className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full rounded border border-grid-orange/12 bg-black/60 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-all focus:border-grid-orange/40 focus:ring-1 focus:ring-grid-orange/20 disabled:opacity-50 resize-y min-h-[80px] ${error ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20" : ""} ${className}`}
          data-agent-role="textarea"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
