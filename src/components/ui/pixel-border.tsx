"use client";

import { ReactNode } from "react";

interface PixelBorderProps {
  children: ReactNode;
  className?: string;
  /** Custom gradient colors — defaults to full rainbow cycle */
  gradient?: string;
  /** Border radius — defaults to rounded-xl */
  rounded?: string;
  /** Whether animation is active */
  active?: boolean;
}

/**
 * Animated conic-gradient rotating border wrapper.
 * Uses CSS @property --border-angle for smooth Houdini rotation.
 */
export function PixelBorder({
  children,
  className = "",
  gradient,
  rounded = "rounded-xl",
  active = true,
}: PixelBorderProps) {
  const gradientStyle = gradient || "conic-gradient(from var(--border-angle), #A34830, #C07050, #B89060, #A35050, #A34830)";

  return (
    <div
      className={`relative ${rounded} ${className}`}
      style={{ isolation: "isolate" }}
    >
      {/* Rotating gradient border */}
      <div
        className={`absolute inset-[-1px] ${rounded} -z-10`}
        style={{
          background: gradientStyle,
          animation: active ? "border-rotate 4s linear infinite" : "none",
        }}
      />
      {/* Inner background fill */}
      <div className={`relative ${rounded} bg-[#0E0B08]`}>
        {children}
      </div>
    </div>
  );
}
