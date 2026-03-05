"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  createGrid,
  randomize,
  step,
  injectPattern,
  population,
  idx,
  PATTERNS,
  type Grid,
} from "./engine";

export interface GameOfLifeProps {
  /** Cell size in pixels */
  cellSize?: number;
  /** Milliseconds between generations */
  interval?: number;
  /** Initial density of alive cells (0-1) */
  density?: number;
  /** Primary alive cell color */
  aliveColor?: string;
  /** Secondary alive cell color (for variation) */
  aliveColorAlt?: string;
  /** Opacity of the entire canvas (0-1) */
  opacity?: number;
  /** Whether to auto-seed with patterns when population drops */
  autoSeed?: boolean;
  /** CSS class for the container */
  className?: string;
  /** Callback with generation count and population */
  onTick?: (gen: number, pop: number) => void;
}

export function GameOfLifeCanvas({
  cellSize = 6,
  interval = 200,
  density = 0.06,
  aliveColor = "#FF6B00",
  aliveColorAlt = "#39FF14",
  opacity = 0.12,
  autoSeed = true,
  className = "",
  onTick,
}: GameOfLifeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Grid | null>(null);
  const prevGridRef = useRef<Grid | null>(null);
  const colsRef = useRef(0);
  const rowsRef = useRef(0);
  const genRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const cols = Math.ceil(w / cellSize);
    const rows = Math.ceil(h / cellSize);
    colsRef.current = cols;
    rowsRef.current = rows;

    const grid = createGrid(cols, rows);
    randomize(grid, cols, rows, density);

    // Seed some interesting patterns scattered around
    const cx = Math.floor(cols / 2);
    const cy = Math.floor(rows / 2);
    injectPattern(grid, PATTERNS.glider, 5, 5, cols, rows);
    injectPattern(grid, PATTERNS.glider, cols - 10, 10, cols, rows);
    injectPattern(grid, PATTERNS.rpentomino, cx, cy, cols, rows);
    injectPattern(grid, PATTERNS.lwss, 10, rows - 10, cols, rows);
    injectPattern(grid, PATTERNS.beehive, cx - 20, cy + 10, cols, rows);

    gridRef.current = grid;
    prevGridRef.current = null;
    genRef.current = 0;
  }, [cellSize, density]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cols = colsRef.current;
    const rows = rowsRef.current;
    const cs = cellSize * dpr;

    // Full clear each frame — no trails, no flicker
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw alive cells as small dots
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (grid[idx(col, row, cols)]) {
          // Alternate color sparingly for visual interest
          const useAlt = (col * 7 + row * 13) % 11 === 0;
          ctx.fillStyle = useAlt ? aliveColorAlt : aliveColor;

          // Draw as a small centered dot (not full cell)
          const dotSize = cs * 0.6;
          const offset = (cs - dotSize) / 2;
          ctx.fillRect(col * cs + offset, row * cs + offset, dotSize, dotSize);
        }
      }
    }
  }, [cellSize, aliveColor, aliveColorAlt]);

  const tick = useCallback(
    (timestamp: number) => {
      rafRef.current = requestAnimationFrame(tick);

      if (timestamp - lastTickRef.current < interval) return;
      lastTickRef.current = timestamp;

      const grid = gridRef.current;
      if (!grid) return;

      const cols = colsRef.current;
      const rows = rowsRef.current;

      // Step simulation
      prevGridRef.current = grid;
      gridRef.current = step(grid, cols, rows, true);
      genRef.current++;

      const pop = population(gridRef.current);

      // Auto-seed if population drops too low
      if (autoSeed && pop < (cols * rows) * 0.01) {
        const rx = Math.floor(Math.random() * (cols - 20)) + 10;
        const ry = Math.floor(Math.random() * (rows - 20)) + 10;
        const patterns = Object.values(PATTERNS);
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        injectPattern(gridRef.current, pattern, rx, ry, cols, rows);
        randomize(gridRef.current, cols, rows, 0.02);
      }

      draw();
      onTick?.(genRef.current, pop);
    },
    [interval, autoSeed, draw, onTick]
  );

  useEffect(() => {
    init();
    // Initial draw
    draw();
    rafRef.current = requestAnimationFrame(tick);

    const handleResize = () => {
      init();
      draw();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [init, draw, tick]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
      data-agent-role="ambient-visualization"
      data-agent-type="conway-game-of-life"
    />
  );
}
