"use client";

import { useEffect, useRef } from "react";

/* ── Grid ── */
const CELL_W = 9;
const CELL_H = 14;
const NOISE_SCALE = 0.065; // controls feature size (~15 cells per cycle)
const CONTOUR_LEVELS = [0.28, 0.42, 0.56, 0.72];
const DEFAULT_DRIFT_X = 0.06; // noise-units / sec
const DEFAULT_DRIFT_Y = 0.03;
const FRAME_MS = 160; // redraw interval

/* ── Marching-squares character table ──
   Bit order: TL(8) TR(4) BL(2) BR(1) */
const MC: string[] = [
  " ", // 0  all below
  "\u256D", // 1  BR  ╭
  "\u256E", // 2  BL  ╮
  "\u2500", // 3  bottom  ─
  "\u2570", // 4  TR  ╰
  "\u2502", // 5  right col  │
  "\u2571", // 6  anti-diag saddle  ╱
  "\u256F", // 7  ~TL below  ╯
  "\u256F", // 8  TL  ╯
  "\u2572", // 9  diag saddle  ╲
  "\u2502", // 10 left col  │
  "\u2570", // 11 ~TR below  ╰
  "\u2500", // 12 top  ─
  "\u256E", // 13 ~BL below  ╮
  "\u256D", // 14 ~BR below  ╭
  " ", // 15 all above
];

/* ── Noise helpers ── */
function fract(v: number) {
  return v - Math.floor(v);
}
function hash(ix: number, iy: number) {
  return fract(Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453);
}
function smooth(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function mix(a: number, b: number, t: number) {
  return a + t * (b - a);
}
function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  return mix(
    mix(hash(xi, yi), hash(xi + 1, yi), xf),
    mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), xf),
    yf
  );
}
function fbm(x: number, y: number) {
  let v = 0;
  let a = 0.58;
  let f = 1;
  for (let i = 0; i < 3; i++) {
    v += a * valueNoise(x * f, y * f);
    a *= 0.48;
    f *= 2.1;
  }
  return v;
}

/**
 * Animated topographic contour field.
 * Uses marching squares algorithm with Perlin-like FBM noise.
 * Unicode box-drawing characters for contour lines.
 * Ported from 4oreverAI.
 */
export function TopoField({
  className,
  driftX = DEFAULT_DRIFT_X,
  driftY = DEFAULT_DRIFT_Y,
  opacityScale = 1,
}: {
  className?: string;
  driftX?: number;
  driftY?: number;
  opacityScale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 0;
    let rows = 0;
    let w = 0;
    let h = 0;
    let prev = 0;

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const r = p.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(r.width / CELL_W);
      rows = Math.ceil(r.height / CELL_H);
      w = r.width;
      h = r.height;
    };

    let animId: number;

    const draw = (time: number) => {
      if (!cols || !rows) {
        animId = requestAnimationFrame(draw);
        return;
      }
      if (time - prev < FRAME_MS) {
        animId = requestAnimationFrame(draw);
        return;
      }
      prev = time;

      const t = prefersReducedMotion ? 0 : time / 1000;
      const ox = t * driftX;
      const oy = t * driftY;

      /* Pre-compute noise at every corner ((cols+1) x (rows+1)) */
      const ng: number[][] = [];
      for (let y = 0; y <= rows; y++) {
        const row: number[] = [];
        for (let x = 0; x <= cols; x++) {
          row.push(fbm(x * NOISE_SCALE + ox, y * NOISE_SCALE + oy));
        }
        ng.push(row);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.font = `${CELL_H - 1}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const tl = ng[y][x];
          const tr = ng[y][x + 1];
          const bl = ng[y + 1][x];
          const br = ng[y + 1][x + 1];

          let bestChar = " ";
          let bestOp = 0;

          for (let li = 0; li < CONTOUR_LEVELS.length; li++) {
            const lv = CONTOUR_LEVELS[li];
            const bits =
              ((tl >= lv ? 1 : 0) << 3) |
              ((tr >= lv ? 1 : 0) << 2) |
              ((bl >= lv ? 1 : 0) << 1) |
              (br >= lv ? 1 : 0);

            const ch = MC[bits];
            if (ch !== " ") {
              const op = (0.04 + li * 0.035) * opacityScale; // 0.04 → 0.145
              if (op > bestOp) {
                bestChar = ch;
                bestOp = Math.min(op, 0.38);
              }
            }
          }

          if (bestChar !== " ") {
            ctx.fillStyle = `rgba(255,255,255,${bestOp})`;
            ctx.fillText(bestChar, x * CELL_W, y * CELL_H);
          }
        }
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(draw);
      }
    };

    resize();
    animId = requestAnimationFrame(draw);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [driftX, driftY, opacityScale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  );
}
