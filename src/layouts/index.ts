import type { Layout } from "../api/types";

/** A key's action. `char` sends its text; the rest map to keyboardd tokens. */
export type KeyKind =
  | "char"
  | "backspace"
  | "space"
  | "enter"
  | "shift"
  | "layout";

export interface KeyDef {
  /** Stable id, unique within a layout; used for focus + tests. */
  id: string;
  label: string;
  kind: KeyKind;
  /** Value sent to keyboardd via POST /api/keyboard/key. */
  send: string;
  /** Visual width weight (1 = square-ish). */
  flex?: number;
  /** Accessible label override. */
  ariaLabel?: string;
}

export type KeyRow = KeyDef[];

export interface LayoutDef {
  id: Layout;
  label: string;
  rows: KeyRow[];
}

/** Factory for character keys: every char key needs the same shape and ids. */
function char(c: string, flex = 1): KeyDef {
  return { id: `k-${c}`, label: c, kind: "char", send: c, flex };
}

export const BACKSPACE: KeyDef = {
  id: "backspace",
  label: "⌫",
  kind: "backspace",
  send: "backspace",
  ariaLabel: "Backspace",
  flex: 1.5,
};
export const SPACE: KeyDef = {
  id: "space",
  label: "space",
  kind: "space",
  send: "space",
  ariaLabel: "Space",
  flex: 4,
};
export const ENTER: KeyDef = {
  id: "enter",
  label: "↵",
  kind: "enter",
  send: "enter",
  ariaLabel: "Enter",
  flex: 2,
};
export const SHIFT: KeyDef = {
  id: "shift",
  label: "⇧",
  kind: "shift",
  send: "shift",
  ariaLabel: "Shift",
  flex: 1.5,
};
export const LAYOUT_SWITCH: KeyDef = {
  id: "layout",
  label: "⌨",
  kind: "layout",
  send: "layout:switch",
  ariaLabel: "Switch layout",
  flex: 1.5,
};

const TEXT_ROWS: KeyRow[] = [
  "qwertyuiop".split("").map((c) => char(c)),
  "asdfghjkl".split("").map((c) => char(c)),
  [SHIFT, ..."zxcvbnm".split("").map((c) => char(c)), BACKSPACE],
  [LAYOUT_SWITCH, SPACE, ENTER],
];

const NUMBER_ROWS: KeyRow[] = [
  "123".split("").map((c) => char(c)),
  "456".split("").map((c) => char(c)),
  "789".split("").map((c) => char(c)),
  [BACKSPACE, char("0"), LAYOUT_SWITCH],
  [ENTER],
];

/** URL adds `.com` `/` `:` `@` `.` on top of the text layout. */
const URL_ROWS: KeyRow[] = [
  "qwertyuiop".split("").map((c) => char(c)),
  "asdfghjkl".split("").map((c) => char(c)),
  [SHIFT, ..."zxcvbnm".split("").map((c) => char(c)), BACKSPACE],
  [".com", "/", ":", "@", "."].map((c) => char(c)),
  [LAYOUT_SWITCH, SPACE, ENTER],
];

export const LAYOUTS: Record<Layout, LayoutDef> = {
  text: { id: "text", label: "Text", rows: TEXT_ROWS },
  number: { id: "number", label: "Number", rows: NUMBER_ROWS },
  url: { id: "url", label: "URL", rows: URL_ROWS },
};

/**
 * Resolve a key's visible label and the value to send, honouring shift for
 * single lowercase letters. Domain rule shared by rendering, DPad confirm and
 * tests, so it stays one function rather than two near-identical ones.
 */
export function resolveKey(key: KeyDef, shift: boolean): { label: string; send: string } {
  if (key.kind === "char" && shift && /^[a-z]$/.test(key.send)) {
    return { label: key.send.toUpperCase(), send: key.send.toUpperCase() };
  }
  return { label: key.label, send: key.send };
}
