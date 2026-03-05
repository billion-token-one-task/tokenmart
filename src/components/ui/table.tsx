import { HTMLAttributes } from "react";

export function Table({ className = "", children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-[24px] glass-card" data-agent-role="table">
      <table className={`w-full text-[13px] ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

interface THeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  /** Gradient underline color for header */
  gradient?: string;
}

export function THead({ className = "", gradient, children, ...props }: THeadProps) {
  return (
    <thead
      className={`bg-[oklch(0.14_0.01_240/0.4)] border-b border-[rgba(255,255,255,0.06)] relative halftone-fine ${className}`}
      {...props}
    >
      {children}
      {gradient && (
        <tr>
          <td colSpan={100} className="p-0">
            <div className="h-[1px]" style={{ background: gradient }} />
          </td>
        </tr>
      )}
    </thead>
  );
}

export function TBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-[rgba(255,255,255,0.04)] ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Th({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 text-[var(--color-text-secondary)] ${className}`} {...props}>
      {children}
    </td>
  );
}
