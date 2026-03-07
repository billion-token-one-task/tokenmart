/**
 * TokenMart Grid Peak logo — sharp mountain dissolving into halftone dots.
 * Infrastructure + ambition. Works at all sizes (favicon through hero).
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 18, className = "" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Solid peak */}
      <path d="M12 2 L6 14.5 L18 14.5 Z" />
      {/* Halftone dissolve — row 1 */}
      <circle cx="7" cy="17" r="1.3" />
      <circle cx="10.5" cy="17" r="1.3" />
      <circle cx="13.5" cy="17" r="1.3" />
      <circle cx="17" cy="17" r="1.3" />
      {/* Row 2 */}
      <circle cx="9" cy="20" r="1" />
      <circle cx="12" cy="20" r="1" />
      <circle cx="15" cy="20" r="1" />
      {/* Row 3 */}
      <circle cx="10.5" cy="22.5" r="0.7" />
      <circle cx="13.5" cy="22.5" r="0.7" />
    </svg>
  );
}
