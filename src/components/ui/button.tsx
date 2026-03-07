"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "pixel" | "glass" | "vercel";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "border-2 border-[#e5005a] bg-[#e5005a] text-white hover:bg-[#0a0a0a] hover:border-[#0a0a0a] hover:text-[#e5005a] active:bg-[#1a1a1a] disabled:border-[var(--color-border-default)] disabled:bg-[var(--color-surface-3)] disabled:text-[var(--color-text-tertiary)] group/btn",
  vercel:
    "border-2 border-[#0a0a0a] bg-[#0a0a0a] text-white hover:bg-[#e5005a] hover:border-[#e5005a] active:bg-[#c20049] disabled:border-[var(--color-border-default)] disabled:bg-[var(--color-surface-3)] disabled:text-[var(--color-text-tertiary)]",
  secondary:
    "border-2 border-[#0a0a0a] bg-white text-[#0a0a0a] hover:bg-[#e5005a] hover:text-white hover:border-[#e5005a] active:bg-[#c20049]",
  ghost:
    "border-2 border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] active:bg-[#1a1a1a]",
  danger:
    "border-2 border-[rgba(213,61,90,0.4)] bg-[rgba(213,61,90,0.08)] text-[var(--color-error)] hover:bg-[rgba(213,61,90,0.18)] hover:border-[rgba(213,61,90,0.6)] active:bg-[rgba(213,61,90,0.25)] disabled:opacity-50",
  outline:
    "border-2 border-[#0a0a0a] bg-transparent text-[#0a0a0a] hover:bg-[#e5005a] hover:border-[#e5005a] hover:text-white active:bg-[#c20049]",
  pixel:
    "border-2 border-[#0a0a0a] bg-white font-pixel-square tracking-[0.12em] text-[#0a0a0a] hover:bg-[#e5005a] hover:border-[#e5005a] hover:text-white",
  glass:
    "border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.65)] text-[#0a0a0a] hover:bg-[#e5005a] hover:border-[#e5005a] hover:text-white",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[13px]",
  lg: "px-5 py-2.5 text-[14px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Wrap in animated gradient border */
  gradientBorder?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, gradientBorder, className = "", children, disabled, ...props }, ref) => {
    const button = (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`group relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-none font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5005a] focus-visible:ring-offset-1 ${variantStyles[variant]} ${sizeStyles[size]} ${gradientBorder ? "relative z-10" : ""} ${className}`}
        data-agent-role="button"
        data-agent-state={loading ? "loading" : disabled ? "disabled" : "ready"}
        {...props}
      >
        {/* Scanline overlay for primary variant on hover */}
        {variant === "primary" && (
          <span
            className="pointer-events-none absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"
            aria-hidden="true"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.06) 4px)",
            }}
          />
        )}
        {loading && (
          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite, glitch-jitter 0.3s steps(2) infinite" }}>
            <rect x="1" y="1" width="5" height="5" fill="currentColor" opacity="0.3" />
            <rect x="10" y="1" width="5" height="5" fill="currentColor" opacity="0.5" />
            <rect x="10" y="10" width="5" height="5" fill="currentColor" opacity="0.7" />
            <rect x="1" y="10" width="5" height="5" fill="currentColor" />
          </svg>
        )}
        <span className="relative z-10">{children}</span>
      </button>
    );

    if (gradientBorder) {
      return (
        <div className="relative inline-flex rounded-none" style={{ isolation: "isolate" }}>
          <div
            className="absolute inset-[-2px] -z-10 rounded-none"
            style={{
              background: "linear-gradient(135deg, #e5005a, #ff4f9f)",
            }}
          />
          {button}
        </div>
      );
    }

    return button;
  }
);

Button.displayName = "Button";
