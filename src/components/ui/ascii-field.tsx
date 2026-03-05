"use client";

import { useEffect, useRef } from "react";

// Halftone density order: lightest → heaviest
const CHARS = " .:-+=X";
const CELL_W = 8;
const CELL_H = 12;
const UPDATE_RATE = 100; // ms between partial grid updates
const UPDATE_FRACTION = 0.10; // fraction of cells to randomize per tick

// Default: terracotta accent (per 4oreverAI design system)
const DEFAULT_COLOR: [number, number, number] = [163, 72, 47];

interface Cell {
  char: string;
  opacity: number;
  density: number;
}

function pickCell(density: number): Cell {
  if (Math.random() > density * 2.0) {
    return { char: " ", opacity: 0, density };
  }
  const maxIdx = Math.ceil(CHARS.length * density);
  const charIdx = Math.min(
    Math.floor(Math.random() * maxIdx),
    CHARS.length - 1
  );
  return {
    char: CHARS[charIdx],
    opacity: density * 0.7 * (0.3 + Math.random() * 0.7),
    density,
  };
}

/**
 * Canvas-based animated ASCII character field.
 * Bridges halftone texture and living motion — the interface is thinking, not decorating.
 * Ported from 4oreverAI with warm terracotta palette.
 */
export function AsciiField({
  className,
  intensity = 1,
  color,
}: {
  className?: string;
  /** 0-1 scale for overall density & brightness. Default 1 (full). */
  intensity?: number;
  /** RGB tuple override. Default: blue [0, 112, 243]. */
  color?: [number, number, number];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    grid: Cell[][];
    cols: number;
    rows: number;
    lastUpdate: number;
    width: number;
    height: number;
  }>({ grid: [], cols: 0, rows: 0, lastUpdate: 0, width: 0, height: 0 });

  const colorR = color?.[0] ?? DEFAULT_COLOR[0];
  const colorG = color?.[1] ?? DEFAULT_COLOR[1];
  const colorB = color?.[2] ?? DEFAULT_COLOR[2];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.ceil(rect.width / CELL_W);
      const rows = Math.ceil(rect.height / CELL_H);
      const grid: Cell[][] = [];

      for (let y = 0; y < rows; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < cols; x++) {
          // Normalized coords: nx ∈ [-1,1], ny = 0 at bottom, 1 at top
          const nx = (x / cols - 0.5) * 2;
          const ny = 1 - y / rows;

          // Density peaks at bottom-center, fades outward and upward
          const dist = Math.sqrt(nx * nx * 0.7 + ny * ny * 1.3);
          const density = Math.max(0, Math.pow(Math.max(0, 1 - dist * 0.7), 2.0)) * intensity;

          row.push(pickCell(density));
        }
        grid.push(row);
      }

      stateRef.current = {
        grid,
        cols,
        rows,
        lastUpdate: 0,
        width: rect.width,
        height: rect.height,
      };
    };

    let animId: number;

    const draw = (time: number) => {
      const state = stateRef.current;
      const { grid, cols, rows, width, height } = state;

      if (!cols || !rows) {
        animId = requestAnimationFrame(draw);
        return;
      }

      // Partial random update for animation (skip if reduced motion)
      if (!prefersReducedMotion && time - state.lastUpdate > UPDATE_RATE) {
        const count = Math.ceil(cols * rows * UPDATE_FRACTION);
        for (let i = 0; i < count; i++) {
          const ry = Math.floor(Math.random() * rows);
          const rx = Math.floor(Math.random() * cols);
          grid[ry][rx] = pickCell(grid[ry][rx].density);
        }
        state.lastUpdate = time;
      }

      // Clear and redraw
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${CELL_H - 1}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = grid[y][x];
          if (cell.char === " " || cell.opacity < 0.01) continue;
          ctx.fillStyle = `rgba(${colorR},${colorG},${colorB},${cell.opacity})`;
          ctx.fillText(cell.char, x * CELL_W, y * CELL_H);
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
  }, [intensity, colorR, colorG, colorB]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    />
  );
}
