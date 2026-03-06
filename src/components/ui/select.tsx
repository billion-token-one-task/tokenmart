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
          <label htmlFor={selectId} className="text-[12px] font-medium text-[#a1a1a1]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full cursor-pointer appearance-none rounded-[6px] border border-[rgba(255,255,255,0.12)] bg-black px-3 py-2.5 pr-9 text-[13px] text-[#ededed] outline-none transition-colors focus:border-[#0070f3] focus:ring-2 focus:ring-[rgba(0,112,243,0.2)] disabled:opacity-50 ${error ? "border-[rgba(238,0,0,0.5)]" : ""} ${className}`}
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
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#444]"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {error && <p className="text-[12px] text-[#ff6166]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
