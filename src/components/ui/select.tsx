"use client";

import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={selectId} className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(10,13,19,0.96),rgba(5,7,11,0.98))] px-3 py-2.5 pr-9 text-[13px] text-[var(--color-text-primary)] outline-none transition-colors focus:border-[rgba(122,162,255,0.28)] focus:ring-2 focus:ring-[rgba(122,162,255,0.14)] disabled:opacity-50 cursor-pointer ${error ? "border-[rgba(255,123,114,0.4)]" : ""} ${className}`}
            data-agent-role="select"
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-quaternary)]"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {error && <p className="text-[12px] text-[#ffb4ae]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
