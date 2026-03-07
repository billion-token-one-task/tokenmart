interface LogoMarkProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function LogoMark({ size = 18, className = "", glow = false }: LogoMarkProps) {
  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2 3h5.5v12.5H12V21H2V3Zm9.5 0H26v4h-9v3.25h7.75v4H17V21h-5.5V3Z"
        fill="currentColor"
      />
      <rect x="20.5" y="16.5" width="5.5" height="1.5" fill="currentColor" opacity="0.5" />
      <rect x="20.5" y="19" width="3.5" height="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );

  if (glow) {
    return (
      <div className="animate-pulse-glow">
        {svg}
      </div>
    );
  }

  return svg;
}
