"use client";

interface AuroraBgProps {
  /** Additional class names */
  className?: string;
  /** Intensity of the aurora (0-1) */
  intensity?: number;
  /** Color palette override */
  palette?: "default" | "auth" | "tokenhall" | "tokenbook" | "admin";
}

const palettes = {
  default: {
    a: "rgba(163, 72, 47, 0.08)",
    b: "rgba(163, 80, 80, 0.06)",
    c: "rgba(184, 144, 96, 0.06)",
    d: "rgba(200, 168, 60, 0.04)",
  },
  auth: {
    a: "rgba(163, 80, 80, 0.1)",
    b: "rgba(192, 112, 104, 0.08)",
    c: "rgba(163, 72, 47, 0.06)",
    d: "rgba(184, 144, 96, 0.04)",
  },
  tokenhall: {
    a: "rgba(184, 144, 96, 0.1)",
    b: "rgba(200, 168, 60, 0.08)",
    c: "rgba(163, 72, 47, 0.06)",
    d: "rgba(184, 144, 96, 0.04)",
  },
  tokenbook: {
    a: "rgba(163, 80, 80, 0.08)",
    b: "rgba(192, 112, 104, 0.08)",
    c: "rgba(163, 72, 47, 0.06)",
    d: "rgba(184, 144, 96, 0.04)",
  },
  admin: {
    a: "rgba(192, 72, 56, 0.08)",
    b: "rgba(208, 160, 40, 0.06)",
    c: "rgba(200, 144, 48, 0.06)",
    d: "rgba(192, 72, 56, 0.04)",
  },
};

export function AuroraBg({
  className = "",
  intensity = 1,
  palette = "default",
}: AuroraBgProps) {
  const p = palettes[palette];

  return (
    <>
      {/* Base aurora gradient mesh */}
      <div
        className={`aurora-bg ${className}`}
        style={{
          opacity: intensity,
          background: `
            radial-gradient(ellipse 82% 54% at 22% 28%, ${p.a}, transparent 72%),
            radial-gradient(ellipse 58% 42% at 82% 18%, ${p.b}, transparent 72%),
            radial-gradient(ellipse 72% 62% at 56% 86%, ${p.c}, transparent 70%),
            radial-gradient(ellipse 44% 26% at 72% 56%, ${p.d}, transparent 68%)
          `,
          backgroundSize: "180% 180%",
        }}
        aria-hidden="true"
      />
      {/* Atmospheric wash — radial depth fog */}
      <div
        className="aurora-bg atmosphere-wash"
        style={{ opacity: intensity * 0.58 }}
        aria-hidden="true"
      />
      {/* Halftone layer — static texture, lighter than the original multi-layer stack */}
      <div
        className="aurora-bg halftone-shade ht-mask-tr-wide"
        style={{ opacity: intensity * 0.2 }}
        aria-hidden="true"
      />
    </>
  );
}
