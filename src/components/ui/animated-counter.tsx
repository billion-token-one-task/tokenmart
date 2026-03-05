"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  /** Target value to count up to */
  value: number;
  /** Duration in ms */
  duration?: number;
  /** Format function (e.g. add commas, suffix) */
  format?: (n: number) => string;
  /** Additional class names */
  className?: string;
  /** Prefix (e.g. "$") */
  prefix?: string;
  /** Suffix (e.g. "+", "%") */
  suffix?: string;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Animated number counter that triggers on scroll-into-view.
 * Counts from 0 to target with easeOutQuart easing.
 */
export function AnimatedCounter({
  value,
  duration = 1500,
  format,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // IntersectionObserver trigger
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasAnimated]);

  // Animation
  useEffect(() => {
    if (!hasAnimated) return;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasAnimated, value, duration]);

  const formatted = format ? format(display) : display.toLocaleString();

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
