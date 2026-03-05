"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-grid-orange text-black hover:bg-grid-orange/90 active:bg-grid-orange/80 disabled:bg-gray-700 disabled:text-gray-500 glow-box-orange",
  secondary:
    "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 border border-grid-orange/15 hover:border-grid-orange/30",
  ghost:
    "bg-transparent text-gray-400 hover:bg-grid-orange/5 hover:text-white active:bg-grid-orange/10",
  danger:
    "bg-red-900/30 text-red-400 hover:bg-red-900/50 active:bg-red-900/70 border border-red-900/30 disabled:opacity-50",
  outline:
    "bg-transparent text-white border border-grid-orange/20 hover:border-grid-orange/40 hover:bg-grid-orange/5 active:bg-grid-orange/10",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[10px] tracking-wider",
  md: "px-4 py-2 text-xs tracking-wide",
  lg: "px-6 py-3 text-sm tracking-wide",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded font-semibold uppercase transition-all duration-150 cursor-pointer disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        data-agent-role="button"
        data-agent-state={loading ? "loading" : disabled ? "disabled" : "ready"}
        {...props}
      >
        {loading && (
          <span className="text-grid-orange animate-gol-blink">⟳</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
