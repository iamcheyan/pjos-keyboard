import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Capability, InputMode, KeyboardState, Layout, Theme } from "../api/types";
import { selectInputMode } from "../keyboard/capability";
import { moveFocus, mapPadButton, type Direction, type PadButton, type Point } from "../keyboard/navigation";
import { LAYOUTS, resolveKey, type KeyDef } from "../layouts";
import { THEMES, themeStyle } from "../theme/themes";

export interface KeyboardProviderProps {
  /** Current layout to render. */
  layout?: Layout;
  /** Negotiated device capabilities; decides Touch vs DPad. */
  capabilities?: Capability[];
  theme?: Theme;
  placeholder?: string;
  secure?: boolean;
  /** Controlled value; when omitted the provider tracks composition itself. */
  value?: string;
  /** Send key/char to keyboardd. */
  onKey?: (key: string) => void;
  /** Resolve composition (maps to POST /api/keyboard/submit). */
  onSubmit?: (value: string) => void;
  /** Hide without submitting. */
  onHide?: () => void;
  /** Layout switch request (SELECT / layout key). */
  onLayoutChange?: (layout: Layout) => void;
  /** Start visible (Desktop Debug default true). */
  initialVisible?: boolean;
  /** Initial DPad focus. */
  initialFocus?: Point;
  /** Expose state changes (used by the showcase). */
  onStateChange?: (state: KeyboardViewState) => void;
}

export interface KeyboardViewState {
  visible: boolean;
  layout: Layout;
  value: string;
  shift: boolean;
  focus: Point;
  inputMode: InputMode;
  theme: Theme;
}

const LAYOUT_ORDER: Layout[] = ["text", "number", "url"];

/**
 * PocketKeyboardProvider — the default KeyboardProvider implementation. It
 * renders the OSK for the layout and input mode, and forwards every key to the
 * Input API via `onKey` / `onSubmit`. It never talks to the keyboard backend
 * directly; the host wires those callbacks to keyboardd.
 */
export function KeyboardProvider(props: KeyboardProviderProps) {
  const {
    layout: layoutProp = "text",
    capabilities = ["Touch"],
    theme = "dark",
    placeholder = "",
    secure = false,
    value: valueProp,
    onKey,
    onSubmit,
    onHide,
    onLayoutChange,
    initialVisible = true,
    initialFocus = { row: 0, col: 0 },
    onStateChange,
  } = props;

  const inputMode = selectInputMode(capabilities);
  const [visible, setVisible] = useState(initialVisible);
  const [layout, setLayout] = useState<Layout>(layoutProp);
  const [internalValue, setInternalValue] = useState(valueProp ?? "");
  const [shift, setShift] = useState(false);
  const [focus, setFocus] = useState<Point>(initialFocus);
  const rootRef = useRef<HTMLDivElement>(null);

  const value = valueProp ?? internalValue;
  const def = LAYOUTS[layout];
  const tokens = THEMES[theme];

  useEffect(() => setLayout(layoutProp), [layoutProp]);

  const state: KeyboardViewState = { visible, layout, value, shift, focus, inputMode, theme };
  useEffect(() => {
    onStateChange?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, layout, value, shift, focus.row, focus.col, inputMode, theme]);

  const send = useCallback(
    (key: KeyDef) => {
      if (key.kind === "shift") {
        setShift((s) => !s);
        return;
      }
      if (key.kind === "layout") {
        const next = LAYOUT_ORDER[(LAYOUT_ORDER.indexOf(layout) + 1) % LAYOUT_ORDER.length];
        setLayout(next);
        onLayoutChange?.(next);
        return;
      }
      if (key.kind === "enter") {
        onSubmit?.(value);
        return;
      }
      const resolved = resolveKey(key, shift);
      if (key.kind === "backspace") {
        const next = Array.from(value).slice(0, -1).join("");
        setInternalValue(next);
      } else if (key.kind === "space") {
        setInternalValue(value + " ");
      } else {
        setInternalValue(value + resolved.send);
      }
      onKey?.(resolved.send);
      if (shift) setShift(false);
    },
    [layout, onKey, onLayoutChange, onSubmit, shift, value],
  );

  const handlePadButton = useCallback(
    (button: PadButton) => {
      const action = mapPadButton(button);
      switch (action.type) {
        case "move": {
          setFocus((p) => moveFocus(def.rows, p, action.direction as Direction));
          return;
        }
        case "confirm": {
          const key = def.rows[focus.row]?.[focus.col];
          if (key) send(key);
          return;
        }
        case "delete": {
          setInternalValue(Array.from(value).slice(0, -1).join(""));
          onKey?.("backspace");
          return;
        }
        case "finish": {
          onSubmit?.(value);
          return;
        }
        case "switch-layout": {
          const next = LAYOUT_ORDER[(LAYOUT_ORDER.indexOf(layout) + 1) % LAYOUT_ORDER.length];
          setLayout(next);
          onLayoutChange?.(next);
          return;
        }
      }
    },
    [def.rows, focus.col, focus.row, layout, onKey, onLayoutChange, onSubmit, send, value],
  );

  // Hardware keyboard: physical keystrokes feed the same path.
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        setInternalValue(Array.from(value).slice(0, -1).join(""));
        onKey?.("backspace");
      } else if (event.key === "Enter") {
        event.preventDefault();
        onSubmit?.(value);
      } else if (event.key.length === 1) {
        setInternalValue(value + event.key);
        onKey?.(event.key);
      }
    };
    const node = rootRef.current;
    node?.addEventListener("keydown", onKeyDown);
    return () => node?.removeEventListener("keydown", onKeyDown);
  }, [onKey, onSubmit, value, visible]);

  const display = useMemo(() => (secure ? "•".repeat(Array.from(value).length) : value), [secure, value]);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      className="pjos-keyboard"
      data-testid="pjos-keyboard"
      data-theme={theme}
      data-input-mode={inputMode}
      data-layout={layout}
      role="group"
      aria-label={`${def.label} keyboard`}
      tabIndex={0}
      style={{
        ...themeStyle(tokens),
        background: tokens.background,
        color: tokens.text,
        position: "fixed",
        inset: "auto 0 0 0",
        padding: 8,
        fontFamily: "system-ui, sans-serif",
        outline: "none",
      }}
    >
      <div
        data-testid="keyboard-value"
        aria-live="polite"
        style={{
          background: tokens.surface,
          border: `1px solid ${tokens.border}`,
          padding: "6px 8px",
          marginBottom: 8,
          minHeight: 24,
          fontFamily: "monospace",
        }}
      >
        {display.length > 0 ? display : <span style={{ opacity: 0.6 }}>{placeholder}</span>}
      </div>

      {def.rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
          {row.map((key, colIndex) => {
            const resolved = resolveKey(key, shift);
            const focused = inputMode === "dpad" && focus.row === rowIndex && focus.col === colIndex;
            return (
              <button
                key={key.id}
                type="button"
                data-key-id={key.id}
                data-focused={focused || undefined}
                aria-label={key.ariaLabel ?? resolved.label}
                aria-pressed={key.kind === "shift" ? shift : undefined}
                onClick={() => send(key)}
                style={{
                  flex: key.flex ?? 1,
                  padding: "10px 0",
                  minHeight: 40,
                  background: focused ? tokens.surfaceFocused : tokens.surface,
                  color: focused ? tokens.textFocused : tokens.text,
                  border: focused ? `2px solid ${tokens.accent}` : `1px solid ${tokens.border}`,
                  fontWeight: focused ? 700 : 400,
                  boxShadow: "none",
                  transition: "none",
                  cursor: "pointer",
                }}
              >
                {resolved.label}
              </button>
            );
          })}
        </div>
      ))}

      {inputMode === "dpad" && (
        <div
          data-testid="dpad-help"
          style={{ fontSize: 11, opacity: 0.8, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <span>D-Pad: move</span>
          <span>A: confirm</span>
          <span>B: delete</span>
          <span>Start: finish</span>
          <span>Select: layout</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        <button
          type="button"
          data-testid="keyboard-submit"
          onClick={() => onSubmit?.(value)}
          style={{
            flex: 1,
            padding: "10px 0",
            background: tokens.accent,
            color: tokens.accentText,
            border: `1px solid ${tokens.accent}`,
            minHeight: 40,
            cursor: "pointer",
          }}
        >
          Submit
        </button>
        <button
          type="button"
          data-testid="keyboard-hide"
          onClick={() => {
            setVisible(false);
            onHide?.();
          }}
          style={{
            flex: 1,
            padding: "10px 0",
            background: tokens.surface,
            color: tokens.text,
            border: `1px solid ${tokens.border}`,
            minHeight: 40,
            cursor: "pointer",
          }}
        >
          Hide
        </button>
      </div>

      {inputMode === "dpad" && (
        <PadBridge enabled onButton={handlePadButton} />
      )}
    </div>
  );
}

/** Gamepad/DPad event source. Real devices bridge evdev; tests drive it directly. */
export function PadBridge({ enabled, onButton }: { enabled: boolean; onButton: (b: PadButton) => void }) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ button?: string }>).detail;
      if (detail?.button) onButton(detail.button as PadButton);
    };
    window.addEventListener("pjos:pad", handler);
    return () => window.removeEventListener("pjos:pad", handler);
  }, [enabled, onButton]);
  return null;
}

export type { KeyboardState };
