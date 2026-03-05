import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  agentEndpoint?: string;
}

export function PageHeader({ title, description, actions, agentEndpoint }: PageHeaderProps) {
  return (
    <div
      className="flex items-start justify-between mb-6"
      data-agent-role="page-header"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-grid-orange animate-gol-blink" />
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-xs text-gray-600 ml-4">{description}</p>
        )}
        {agentEndpoint && (
          <div className="text-[9px] text-grid-orange/20 font-mono ml-4 mt-0.5">
            {agentEndpoint}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
