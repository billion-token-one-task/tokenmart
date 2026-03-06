import { HTMLAttributes } from "react";

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
  | "none";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "highlight" | "inset" | "gradient" | "glass" | "glass-elevated";
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
  none: "",
};

function PatternOverlay({ pattern }: { pattern?: PatternTexture }) {
  if (!pattern || pattern === "none") return null;
  const cls = patternClasses[pattern];
  if (!cls) return null;

  const isRisograph = pattern === "risograph" || pattern === "newspaper";
  // Risograph/newspaper use ::after pseudo-elements, so we just add the class
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

export function Card({ variant = "default", grainOverlay, pattern, className = "", children, ...props }: CardProps) {
  if (variant === "gradient") {
    return (
      <div
        className={`relative rounded-[8px] ${className}`}
        style={{ isolation: "isolate" }}
        data-agent-role="card"
        {...props}
      >
        <div
          className="absolute inset-[-1px] rounded-[8px] -z-10"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.06))",
          }}
        />
        <div className={`relative overflow-hidden rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] ${grainOverlay ? "grain-overlay" : ""}`}>
          <PatternOverlay pattern={pattern} />
          {children}
        </div>
      </div>
    );
  }

  const variants = {
    default:
      "rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] transition-colors hover:border-[rgba(255,255,255,0.14)]",
    highlight:
      "rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[#0a0a0a]",
    inset:
      "rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-black",
    glass:
      "rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] transition-colors hover:border-[rgba(255,255,255,0.14)]",
    "glass-elevated":
      "rounded-[8px] border border-[rgba(255,255,255,0.12)] bg-[#111] transition-colors hover:border-[rgba(255,255,255,0.16)]",
  };

  const v = variant as keyof typeof variants;

  return (
    <div
      className={`relative overflow-hidden ${variants[v]} ${grainOverlay ? "grain-overlay" : ""} ${className}`}
      data-agent-role="card"
      {...props}
    >
      <PatternOverlay pattern={pattern} />
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`border-b border-[rgba(255,255,255,0.08)] px-4 py-3 ${className}`} {...props}>
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
    <div className={`border-t border-[rgba(255,255,255,0.08)] px-4 py-3 ${className}`} {...props}>
      {children}
    </div>
  );
}
