"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "pixel" | "glass" | "vercel";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-white bg-white text-black hover:bg-[#ccc] active:bg-[#999] disabled:bg-[#333] disabled:text-[#666]",
  vercel:
    "border border-white bg-white text-black hover:bg-[#ccc] active:bg-[#999] disabled:bg-[#333] disabled:text-[#666]",
  secondary:
    "border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] text-[#ededed] hover:bg-[rgba(255,255,255,0.08)] active:bg-[rgba(255,255,255,0.1)]",
  ghost:
    "border border-transparent bg-transparent text-[#a1a1a1] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#ededed] active:bg-[rgba(255,255,255,0.08)]",
  danger:
    "border border-[rgba(238,0,0,0.3)] bg-[rgba(238,0,0,0.08)] text-[#ff6166] hover:bg-[rgba(238,0,0,0.14)] active:bg-[rgba(238,0,0,0.2)] disabled:opacity-50",
  outline:
    "border border-[rgba(255,255,255,0.15)] bg-transparent text-[#ededed] hover:bg-[rgba(255,255,255,0.04)] active:bg-[rgba(255,255,255,0.08)]",
  pixel:
    "border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] font-pixel-square uppercase tracking-[0.16em] text-[#ededed] hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)]",
  glass:
    "border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[#ededed] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)]",
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
        className={`inline-flex items-center justify-center gap-2 rounded-[6px] font-medium transition-[background-color,border-color,color,box-shadow] duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${variantStyles[variant]} ${sizeStyles[size]} ${gradientBorder ? "relative z-10" : ""} ${className}`}
        data-agent-role="button"
        data-agent-state={loading ? "loading" : disabled ? "disabled" : "ready"}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="5" height="5" fill="currentColor" opacity="0.3" />
            <rect x="10" y="1" width="5" height="5" fill="currentColor" opacity="0.5" />
            <rect x="10" y="10" width="5" height="5" fill="currentColor" opacity="0.7" />
            <rect x="1" y="10" width="5" height="5" fill="currentColor" />
          </svg>
        )}
        {children}
      </button>
    );

    if (gradientBorder) {
      return (
        <div className="relative inline-flex rounded-[6px]" style={{ isolation: "isolate" }}>
          <div
            className="absolute inset-[-1px] rounded-[6px] -z-10"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.08))",
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
