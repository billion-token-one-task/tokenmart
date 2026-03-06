import { HTMLAttributes } from "react";

export function Table({ className = "", children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative overflow-x-auto rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a]" data-agent-role="table">
      {/* Halftone texture overlay on table */}
      <div
        className="pointer-events-none absolute inset-0 halftone-fine opacity-20"
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(180deg, black 0%, transparent 30%)",
          WebkitMaskImage: "linear-gradient(180deg, black 0%, transparent 30%)",
        }}
      />
      <table className={`relative w-full text-[13px] ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-[rgba(255,255,255,0.06)] ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Th({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left text-[11px] font-medium text-[#666] ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 text-[#a1a1a1] ${className}`} {...props}>
      {children}
    </td>
  );
}
