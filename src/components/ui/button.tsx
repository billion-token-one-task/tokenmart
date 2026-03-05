"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "pixel" | "glass" | "warm";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-[rgba(255,255,255,0.18)] bg-[#f5f7fb] text-[#05070b] hover:bg-[#ffffff] active:bg-[#dfe5f0] disabled:bg-[#1d2330] disabled:text-[#788092] shadow-[0_20px_42px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.72)]",
  secondary:
    "border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(15,18,27,0.94),rgba(8,10,16,0.96))] text-[var(--color-text-primary)] hover:border-[rgba(255,255,255,0.16)] hover:bg-[linear-gradient(180deg,rgba(18,22,31,0.96),rgba(10,12,19,0.98))] active:bg-[linear-gradient(180deg,rgba(11,14,20,0.98),rgba(7,9,14,1))]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--color-text-primary)] active:bg-[rgba(255,255,255,0.08)]",
  danger:
    "border border-[rgba(255,123,114,0.24)] bg-[linear-gradient(180deg,rgba(63,20,24,0.84),rgba(34,12,15,0.8))] text-[#ffb4ae] hover:bg-[linear-gradient(180deg,rgba(84,25,31,0.9),rgba(41,15,19,0.84))] active:bg-[linear-gradient(180deg,rgba(52,18,22,0.96),rgba(31,11,14,0.92))] disabled:opacity-50",
  outline:
    "border border-[rgba(255,255,255,0.12)] bg-transparent text-[var(--color-text-primary)] hover:border-[rgba(255,255,255,0.22)] hover:bg-[rgba(255,255,255,0.04)] active:bg-[rgba(255,255,255,0.07)]",
  pixel:
    "border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(16,20,29,0.92),rgba(8,11,17,0.94))] font-pixel-square uppercase tracking-[0.18em] text-[var(--color-text-primary)] hover:border-[rgba(255,255,255,0.24)] hover:bg-[linear-gradient(180deg,rgba(19,24,34,0.94),rgba(9,12,18,0.96))]",
  glass:
    "border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(15,18,27,0.78),rgba(8,11,17,0.82))] text-[var(--color-text-primary)] backdrop-blur-[12px] hover:border-[rgba(255,255,255,0.16)] hover:bg-[linear-gradient(180deg,rgba(18,22,31,0.82),rgba(10,12,19,0.86))] shadow-[0_16px_34px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.05)] active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.24)]",
  warm:
    "border border-[rgba(88,126,255,0.28)] bg-[linear-gradient(180deg,#5c82ff_0%,#4d6bfe_42%,#304bc2_100%)] text-white shadow-[0_18px_38px_rgba(31,54,155,0.26),inset_0_1px_0_rgba(226,234,252,0.16),inset_0_-1px_0_rgba(0,0,0,0.18)] hover:shadow-[0_22px_42px_rgba(31,54,155,0.32),inset_0_1px_0_rgba(226,234,252,0.18)] active:shadow-[inset_0_2px_8px_rgba(0,0,0,0.24)]",
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
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${sizeStyles[size]} ${gradientBorder ? "relative z-10" : ""} ${className}`}
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
        <div className="relative inline-flex rounded-xl" style={{ isolation: "isolate" }}>
          <div
            className="absolute inset-[-1px] rounded-xl -z-10"
            style={{
              background: "conic-gradient(from var(--border-angle), #f5f7fb, #7aa2ff, #7ee787, #f5f7fb)",
              animation: "border-rotate 4s linear infinite",
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
