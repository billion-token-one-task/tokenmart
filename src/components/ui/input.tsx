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
          <label htmlFor={inputId} className="text-[12px] font-medium text-[#a1a1a1]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-black px-3 py-2.5 text-[14px] text-[#ededed] placeholder:text-[#444] outline-none transition-colors duration-150 focus:border-[#0070f3] focus:ring-2 focus:ring-[rgba(0,112,243,0.2)] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-[rgba(238,0,0,0.5)] focus:border-[#ee0000] focus:ring-[rgba(238,0,0,0.15)]" : ""} ${className}`}
          data-agent-role="input"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="text-[12px] text-[#ff6166]">{error}</p>}
        {hint && !error && <p className="text-[12px] text-[#444]">{hint}</p>}
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
          <label htmlFor={inputId} className="text-[12px] font-medium text-[#a1a1a1]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`min-h-[96px] w-full resize-y rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-black px-3 py-2.5 text-[14px] text-[#ededed] placeholder:text-[#444] outline-none transition-colors duration-150 focus:border-[#0070f3] focus:ring-2 focus:ring-[rgba(0,112,243,0.2)] disabled:opacity-50 ${error ? "border-[rgba(238,0,0,0.5)] focus:border-[#ee0000] focus:ring-[rgba(238,0,0,0.15)]" : ""} ${className}`}
          data-agent-role="textarea"
          data-agent-field={inputId}
          {...props}
        />
        {error && <p className="text-[12px] text-[#ff6166]">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
