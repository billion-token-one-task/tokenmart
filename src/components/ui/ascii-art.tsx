"use client";

import { useEffect, useState, useRef } from "react";

interface AsciiArtProps {
  lines: readonly string[];
  gradient?: { from: string; to: string };
  className?: string;
  animate?: "typing" | "fade-lines" | "none";
  animationDuration?: number; // ms per line
  pixelFont?: string; // font-pixel-square, font-pixel-grid, etc.
  opacity?: number;
  size?: "sm" | "md" | "lg";
}

function interpolateColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from);
  const tC = hexToRgb(to);
  if (!f || !tC) return from;
  const r = Math.round(f.r + (tC.r - f.r) * t);
  const g = Math.round(f.g + (tC.g - f.g) * t);
  const b = Math.round(f.b + (tC.b - f.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

export function AsciiArt({
  lines,
  gradient,
  className = "",
  animate = "none",
  animationDuration = 60,
  pixelFont = "font-pixel-square",
  opacity = 1,
  size = "md",
}: AsciiArtProps) {
  const [visibleLines, setVisibleLines] = useState(animate === "none" ? lines.length : 0);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  // IntersectionObserver for scroll-triggered animation
  useEffect(() => {
    if (animate === "none") return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [animate]);

  // Animate lines appearing
  useEffect(() => {
    if (!isInView || animate === "none") return;
    if (visibleLines >= lines.length) return;
    const timer = setTimeout(() => {
      setVisibleLines((v) => v + 1);
    }, animationDuration);
    return () => clearTimeout(timer);
  }, [isInView, visibleLines, lines.length, animationDuration, animate]);

  const sizeClasses = {
    sm: "text-[8px] sm:text-[10px] leading-[1.1]",
    md: "text-[10px] sm:text-[12px] md:text-[14px] leading-[1.2]",
    lg: "text-[12px] sm:text-[16px] md:text-[18px] lg:text-[20px] leading-[1.2]",
  };

  return (
    <pre
      ref={ref}
      className={`${pixelFont} ${sizeClasses[size]} whitespace-pre select-none overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      {lines.map((line, i) => {
        const isVisible = i < visibleLines;
        const t = lines.length > 1 ? i / (lines.length - 1) : 0;
        const color = gradient ? interpolateColor(gradient.from, gradient.to, t) : undefined;

        return (
          <span
            key={i}
            className="block transition-opacity duration-300"
            style={{
              color,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "none" : "translateY(4px)",
              transition: animate === "fade-lines"
                ? `opacity 0.4s ease ${i * 0.04}s, transform 0.4s ease ${i * 0.04}s`
                : undefined,
              textShadow: color ? `0 0 8px ${color}40, 0 0 20px ${color}15` : undefined,
            }}
          >
            {line}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}
