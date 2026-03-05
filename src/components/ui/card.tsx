import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlight" | "inset";
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const variants = {
    default: "grid-card rounded-lg",
    highlight: "grid-card rounded-lg border-grid-orange/25 glow-box-orange",
    inset: "bg-black/30 rounded-lg border border-grid-orange/5",
  };
  return (
    <div
      className={`${variants[variant]} ${className}`}
      data-agent-role="card"
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 py-3 border-b border-grid-orange/8 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-4 py-3 border-t border-grid-orange/8 ${className}`} {...props}>
      {children}
    </div>
  );
}
