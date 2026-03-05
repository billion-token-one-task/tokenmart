import { HTMLAttributes } from "react";

export function Table({ className = "", children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-grid-orange/10" data-agent-role="table">
      <table className={`w-full text-xs ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-black/40 border-b border-grid-orange/8 ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-grid-orange/5 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function Th({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-4 py-2.5 text-left text-[9px] font-semibold text-gray-600 uppercase tracking-[0.2em] ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className = "", children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-2.5 text-gray-400 ${className}`} {...props}>
      {children}
    </td>
  );
}
