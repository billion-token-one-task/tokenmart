"use client";

import { HalftoneOverlay } from "./halftone-overlay";

interface TrustDitherProps {
  tier: 0 | 1 | 2 | 3;
  as?: React.ElementType;
  className?: string;
  children: React.ReactNode;
  showOverlay?: boolean;
}

export function TrustDither({
  tier,
  as: Tag = "div",
  className = "",
  children,
  showOverlay = true,
}: TrustDitherProps) {
  return (
    <Tag
      className={`relative trust-tier-${tier} ${className}`}
      data-agent-role="trust-dither"
      data-agent-value={`tier-${tier}`}
    >
      {showOverlay && <HalftoneOverlay trustTier={tier} />}
      {children}
    </Tag>
  );
}
