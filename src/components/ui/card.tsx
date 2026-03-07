import { HTMLAttributes, useId } from "react";

type PatternTexture =
  | "halftone"
  | "crosshatch"
  | "dither"
  | "stipple"
  | "risograph"
  | "engraving"
  | "crt"
  | "blueprint"
  | "newspaper"
  | "diagonal-hatch"
  | "none";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlight" | "inset" | "gradient" | "glass" | "glass-elevated" | "specimen";
  /** Add film grain overlay texture */
  grainOverlay?: boolean;
  /** Background pattern texture */
  pattern?: PatternTexture;
}

const patternClasses: Record<PatternTexture, string> = {
  halftone: "halftone-stagger",
  crosshatch: "crosshatch",
  dither: "dither-bayer-4",
  stipple: "stipple",
  risograph: "texture-risograph",
  engraving: "texture-engraving",
  crt: "crt-phosphor",
  blueprint: "texture-blueprint",
  newspaper: "texture-newspaper",
  "diagonal-hatch": "",
  none: "",
};

function DiagonalHatchOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      aria-hidden="true"
      style={{
        backgroundImage: "repeating-linear-gradient(45deg, #0a0a0a 0px, #0a0a0a 1px, transparent 1px, transparent 6px)",
      }}
    />
  );
}

function PatternOverlay({ pattern }: { pattern?: PatternTexture }) {
  if (!pattern || pattern === "none") return null;
  if (pattern === "diagonal-hatch") return <DiagonalHatchOverlay />;

  const cls = patternClasses[pattern];
  if (!cls) return null;

  const isRisograph = pattern === "risograph" || pattern === "newspaper";
  if (isRisograph) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 ${cls}`}
        aria-hidden="true"
        style={{
          maskImage: "linear-gradient(135deg, black 0%, transparent 60%)",
          WebkitMaskImage: "linear-gradient(135deg, black 0%, transparent 60%)",
        }}
      />
    );
  }

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${cls} opacity-50`}
      aria-hidden="true"
      style={{
        maskImage: "linear-gradient(135deg, black 0%, transparent 55%)",
        WebkitMaskImage: "linear-gradient(135deg, black 0%, transparent 55%)",
      }}
    />
  );
}

/* Viewfinder bracket corners - 4 L-shaped brackets at card corners */
function ViewfinderBrackets() {
  const bracketStyle = "absolute w-3 h-3 pointer-events-none";
  return (
    <>
      {/* Top-left */}
      <span className={`${bracketStyle} top-0 left-0 border-t-2 border-l-2 border-[#e5005a]`} aria-hidden="true" />
      {/* Top-right */}
      <span className={`${bracketStyle} top-0 right-0 border-t-2 border-r-2 border-[#e5005a]`} aria-hidden="true" />
      {/* Bottom-left */}
      <span className={`${bracketStyle} bottom-0 left-0 border-b-2 border-l-2 border-[#e5005a]`} aria-hidden="true" />
      {/* Bottom-right */}
      <span className={`${bracketStyle} bottom-0 right-0 border-b-2 border-r-2 border-[#e5005a]`} aria-hidden="true" />
    </>
  );
}

export function Card({ variant = "default", grainOverlay, pattern, className = "", children, ...props }: CardProps) {
  const specimenStamp = useId().replace(/:/g, "").slice(-6).padStart(6, "0");

  if (variant === "gradient") {
    return (
      <div
        className={`relative rounded-none ${className}`}
        style={{ isolation: "isolate" }}
        data-agent-role="card"
        {...props}
      >
        <div
          className="absolute inset-[-2px] -z-10 rounded-none"
          style={{
            background: "linear-gradient(135deg, #e5005a, rgba(255,183,214,0.4))",
          }}
        />
        <div className={`relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-[var(--color-surface-0)] ${grainOverlay ? "grain-overlay" : ""}`}>
          <ViewfinderBrackets />
          <PatternOverlay pattern={pattern} />
          {children}
        </div>
      </div>
    );
  }

  if (variant === "specimen") {
    return (
      <div
        className={`relative overflow-hidden rounded-none border-2 border-[#0a0a0a] bg-white ${grainOverlay ? "grain-overlay" : ""} ${className}`}
        data-agent-role="card"
        {...props}
      >
        {/* Top specimen label bar */}
        <div className="flex items-center justify-between border-b-2 border-[#0a0a0a] bg-[#0a0a0a] px-3 py-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#e5005a]">SPECIMEN</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
            {specimenStamp}
          </span>
        </div>
        <ViewfinderBrackets />
        <DiagonalHatchOverlay />
        <PatternOverlay pattern={pattern} />
        {children}
      </div>
    );
  }

  const variants = {
    default:
      "rounded-none border-2 border-[#0a0a0a] bg-[var(--color-surface-0)] shadow-none transition-colors hover:border-[#e5005a]",
    highlight:
      "rounded-none border-2 border-[#e5005a] bg-[var(--color-brand-soft)]",
    inset:
      "rounded-none border-2 border-[#0a0a0a] bg-[var(--color-canvas)]",
    glass:
      "rounded-none border-2 border-[#0a0a0a] bg-[rgba(255,255,255,0.72)] shadow-none transition-colors hover:border-[#e5005a]",
    "glass-elevated":
      "rounded-none border-2 border-[#0a0a0a] bg-[var(--color-canvas-strong)] shadow-none transition-colors hover:border-[#e5005a]",
  };

  const v = variant as keyof typeof variants;
  const needsBrackets = variant === "highlight" || variant === "glass-elevated";

  return (
    <div
      className={`relative overflow-hidden ${variants[v]} ${grainOverlay ? "grain-overlay" : ""} ${className}`}
      data-agent-role="card"
      {...props}
    >
      {needsBrackets && <ViewfinderBrackets />}
      <PatternOverlay pattern={pattern} />
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-b-2 border-[#0a0a0a] px-4 py-3 ${className}`} {...props}>
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
    <div className={`border-t-2 border-[#0a0a0a] px-4 py-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
