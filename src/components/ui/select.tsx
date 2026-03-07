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
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full cursor-pointer appearance-none rounded-none border-2 border-[#0a0a0a] bg-white px-3 py-2.5 pr-10 font-mono text-[13px] text-[#0a0a0a] outline-none transition-all duration-150 focus:border-[#e5005a] focus:ring-0 disabled:opacity-50 ${error ? "border-[rgba(213,61,90,0.6)]" : ""} ${className}`}
            data-agent-role="select"
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Industrial dropdown arrow - sharp chevron */}
          <div className="pointer-events-none absolute right-0 top-0 flex h-full w-10 items-center justify-center border-l-2 border-[#0a0a0a] bg-[#0a0a0a] text-white transition-colors">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </div>
        </div>
        {error && <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-error)]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
