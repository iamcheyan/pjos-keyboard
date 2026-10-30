import type { KeyRow } from "../layouts";

/**
 * Spatial DPad navigation over a row-structured layout.
 *
 * Grid rows have different key counts, so left/right walk the flattened reading
 * order and up/down use column index clamped per row — the behaviour a DPad user
 * expects on a handheld. Kept dependency-free so it is unit-testable without DOM.
 */
export interface Point {
  row: number;
  col: number;
}

export function clampPoint(rows: readonly KeyRow[], point: Point): Point {
  if (rows.length === 0) return { row: 0, col: 0 };
  const row = Math.min(Math.max(point.row, 0), rows.length - 1);
  const col = Math.min(Math.max(point.col, 0), rows[row].length - 1);
  return { row, col };
}

export function moveFocus(rows: readonly KeyRow[], from: Point, direction: Direction): Point {
  const here = clampPoint(rows, from);
  switch (direction) {
    case "left": {
      if (here.col > 0) return { row: here.row, col: here.col - 1 };
      if (here.row === 0) return here;
      const prev = here.row - 1;
      return { row: prev, col: rows[prev].length - 1 };
    }
    case "right": {
      if (here.col < rows[here.row].length - 1) return { row: here.row, col: here.col + 1 };
      if (here.row === rows.length - 1) return here;
      return { row: here.row + 1, col: 0 };
    }
    case "up": {
      if (here.row === 0) return here;
      return clampPoint(rows, { row: here.row - 1, col: here.col });
    }
    case "down": {
      if (here.row === rows.length - 1) return here;
      return clampPoint(rows, { row: here.row + 1, col: here.col });
    }
  }
}

export type Direction = "up" | "down" | "left" | "right";

/** Semantic buttons a gamepad/DPad provider reports. */
export type PadButton = "a" | "b" | "start" | "select" | "up" | "down" | "left" | "right";

export type PadAction =
  | { type: "move"; direction: Direction }
  | { type: "confirm" }
  | { type: "delete" }
  | { type: "finish" }
  | { type: "switch-layout" };

/**
 * Map a semantic button to a keyboard action. This is the single mapping table
 * for DPad Mode, shared by the provider and tests (no per-device branches).
 */
export function mapPadButton(button: PadButton): PadAction {
  switch (button) {
    case "up":
    case "down":
    case "left":
    case "right":
      return { type: "move", direction: button };
    case "a":
      return { type: "confirm" };
    case "b":
      return { type: "delete" };
    case "start":
      return { type: "finish" };
    case "select":
      return { type: "switch-layout" };
  }
}
