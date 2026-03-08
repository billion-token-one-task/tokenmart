import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  eyebrow = "NO ACTIVE SIGNAL",
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`relative overflow-hidden border-2 border-dashed border-[#0a0a0a] bg-[rgba(255,251,253,0.95)] px-5 py-10 text-center ${className}`}>
      <div className="pointer-events-none absolute inset-0 crosshatch-wide opacity-[0.12]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[#e5005a]" aria-hidden="true" />
      <div className="relative flex flex-col items-center justify-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-[#0a0a0a] bg-[#fff4f8] text-[#6b6050]">
          {icon}
        </div>
      )}
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8a7a68]">{eyebrow}</div>
      <h3 className="mt-2 font-display text-[2rem] uppercase leading-none text-[#0a0a0a]">{title}</h3>
      {description && <p className="mt-3 max-w-xl text-[14px] leading-6 text-[#4a4036]">{description}</p>}
      {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
