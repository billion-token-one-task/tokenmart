import { HTMLAttributes } from "react";

export function Table({ className = "", children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative overflow-x-auto rounded-none border-2 border-[#0a0a0a] bg-white" data-agent-role="table">
      <table className={`relative w-full text-[13px] ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={`relative border-b-2 border-[#0a0a0a] bg-[#0a0a0a] text-white ${className}`}
      {...props}
    >
      {/* Scanline pattern on thead */}
      <tr className="pointer-events-none absolute inset-0" aria-hidden="true">
        <td>
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
            }}
          />
        </td>
      </tr>
      {children}
    </thead>
  );
}

export function TBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y-2 divide-[#0a0a0a]/10 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Th({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`group/row px-4 py-3 font-mono text-[12px] text-[var(--color-text-secondary)] transition-colors ${className}`} {...props}>
      {children}
    </td>
  );
}

/* Wrap table rows with this for hover pink left border accent */
export function Tr({ className = "", children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-all duration-100 hover:bg-[rgba(229,0,90,0.03)] hover:border-l-[3px] hover:border-l-[#e5005a] ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}
