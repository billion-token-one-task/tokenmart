import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(12,16,24,0.74),rgba(7,10,16,0.82))] px-4 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.04)] text-[var(--color-text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h3>
      {description && <p className="mb-6 max-w-md text-[13px] text-[var(--color-text-secondary)]">{description}</p>}
      {action}
    </div>
  );
}
