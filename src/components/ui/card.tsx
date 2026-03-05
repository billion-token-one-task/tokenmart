import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlight" | "inset" | "gradient" | "glass" | "glass-elevated";
  /** Add film grain overlay texture */
  grainOverlay?: boolean;
}

export function Card({ variant = "default", grainOverlay, className = "", children, ...props }: CardProps) {
  if (variant === "gradient") {
    return (
      <div
        className={`relative rounded-xl transition-all duration-300 hover:-translate-y-0.5 ${className}`}
        style={{ isolation: "isolate" }}
        data-agent-role="card"
        {...props}
      >
        <div
          className="absolute inset-[-1px] rounded-xl -z-10"
          style={{
            background: "conic-gradient(from var(--border-angle), #A34830, #C07050, #D0A028, #A35050, #A34830)",
            animation: "border-rotate 4s linear infinite",
          }}
        />
        <div className={`shell-panel rounded-xl relative ${grainOverlay ? "grain-overlay" : ""}`}>
          {children}
        </div>
      </div>
    );
  }

  const variants = {
    default:
      "shell-panel rounded-[20px] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.16)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.05)]",
    highlight:
      "rounded-[20px] border border-[rgba(122,162,255,0.2)] bg-[linear-gradient(180deg,rgba(16,20,30,0.96),rgba(8,11,17,0.98))] shadow-[0_22px_48px_rgba(0,0,0,0.32),0_0_28px_rgba(122,162,255,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 hover:shadow-[0_26px_54px_rgba(0,0,0,0.36),0_0_34px_rgba(122,162,255,0.14)]",
    inset:
      "rounded-[20px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(8,11,17,0.96),rgba(4,6,11,0.98))] shadow-[inset_0_2px_8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.02)]",
    glass:
      "glass-card rounded-[20px] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.16)] hover:shadow-[0_24px_52px_rgba(0,0,0,0.34),0_0_22px_rgba(122,162,255,0.08)]",
    "glass-elevated":
      "glass-card-elevated rounded-[22px] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.18)] hover:shadow-[0_28px_58px_rgba(0,0,0,0.38),0_0_24px_rgba(122,162,255,0.1)]",
  };

  const v = variant as keyof typeof variants;

  return (
    <div
      className={`${variants[v]} ${grainOverlay ? "grain-overlay" : ""} ${className}`}
      data-agent-role="card"
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 border-b border-[rgba(255,255,255,0.08)] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 border-t border-[rgba(255,255,255,0.08)] ${className}`} {...props}>
      {children}
    </div>
  );
}
