/**
 * Conway's Game of Life Engine
 * Pure TypeScript simulation with typed grid operations.
 * Supports toroidal wrapping and seeded pattern injection.
 */

export type Grid = Uint8Array;

export interface EngineConfig {
  cols: number;
  rows: number;
  wrap?: boolean;
}

export function createGrid(cols: number, rows: number): Grid {
  return new Uint8Array(cols * rows);
}

export function idx(col: number, row: number, cols: number): number {
  return row * cols + col;
}

export function randomize(grid: Grid, cols: number, rows: number, density = 0.15): void {
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < density ? 1 : 0;
  }
}

export function countNeighbors(
  grid: Grid,
  col: number,
  row: number,
  cols: number,
  rows: number,
  wrap: boolean
): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      let nc = col + dx;
      let nr = row + dy;
      if (wrap) {
        nc = (nc + cols) % cols;
        nr = (nr + rows) % rows;
      } else if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) {
        continue;
      }
      count += grid[idx(nc, nr, cols)];
    }
  }
  return count;
}

export function step(grid: Grid, cols: number, rows: number, wrap = true): Grid {
  const next = new Uint8Array(grid.length);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = idx(col, row, cols);
      const neighbors = countNeighbors(grid, col, row, cols, rows, wrap);
      const alive = grid[i];
      if (alive) {
        next[i] = neighbors === 2 || neighbors === 3 ? 1 : 0;
      } else {
        next[i] = neighbors === 3 ? 1 : 0;
      }
    }
  }
  return next;
}

/** Inject a pattern at (ox, oy). Pattern is array of [col, row] relative offsets. */
export function injectPattern(
  grid: Grid,
  pattern: [number, number][],
  ox: number,
  oy: number,
  cols: number,
  rows: number
): void {
  for (const [dx, dy] of pattern) {
    const c = (ox + dx + cols) % cols;
    const r = (oy + dy + rows) % rows;
    grid[idx(c, r, cols)] = 1;
  }
}

// Classic patterns
export const PATTERNS = {
  glider: [
    [1, 0], [2, 1], [0, 2], [1, 2], [2, 2],
  ] as [number, number][],

  blinker: [
    [0, 0], [1, 0], [2, 0],
  ] as [number, number][],

  pulsar: [
    // Top-left quadrant pattern (symmetric)
    [2, 0], [3, 0], [4, 0], [8, 0], [9, 0], [10, 0],
    [0, 2], [5, 2], [7, 2], [12, 2],
    [0, 3], [5, 3], [7, 3], [12, 3],
    [0, 4], [5, 4], [7, 4], [12, 4],
    [2, 5], [3, 5], [4, 5], [8, 5], [9, 5], [10, 5],
    [2, 7], [3, 7], [4, 7], [8, 7], [9, 7], [10, 7],
    [0, 8], [5, 8], [7, 8], [12, 8],
    [0, 9], [5, 9], [7, 9], [12, 9],
    [0, 10], [5, 10], [7, 10], [12, 10],
    [2, 12], [3, 12], [4, 12], [8, 12], [9, 12], [10, 12],
  ] as [number, number][],

  rpentomino: [
    [1, 0], [2, 0], [0, 1], [1, 1], [1, 2],
  ] as [number, number][],

  lwss: [
    [1, 0], [4, 0], [0, 1], [0, 2], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3],
  ] as [number, number][],

  block: [
    [0, 0], [1, 0], [0, 1], [1, 1],
  ] as [number, number][],

  beehive: [
    [1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2],
  ] as [number, number][],
};

/** Get population count */
export function population(grid: Grid): number {
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    count += grid[i];
  }
  return count;
}
