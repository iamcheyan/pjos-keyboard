/**
 * Shared contract types for the PJOS Universal Input Framework.
 * These mirror keyboardd's Go types (runtime/keyboardd/keyboardd.go) and the
 * Input API documented in pjos-input-framework/docs/INPUT-API.md.
 */

export type Layout = "text" | "number" | "url";

/** Names reserved for future layouts; keyboardd answers 501 for these. */
export type ReservedLayout = "search" | "password" | "emoji" | "voice" | "ai";

export type Capability = "Touch" | "DPad" | "Gamepad" | "HardwareKeyboard";

export type InputMode = "touch" | "dpad";

export type Theme = "light" | "dark" | "oled";

export interface KeyboardState {
  visible: boolean;
  layout: Layout;
  value: string;
  placeholder: string;
  secure: boolean;
  capabilities: Capability[];
  inputMode: InputMode;
  focusedInput: string;
  provider: string;
  theme: Theme;
}

export interface ShowOptions {
  layout?: Layout;
  value?: string;
  placeholder?: string;
  secure?: boolean;
  capabilities?: Capability[];
  theme?: Theme;
  options?: Record<string, unknown>;
}

/** What the active provider reports it would draw (mirrors keyboardd RenderSpec). */
export interface RenderSpec {
  layout: Layout;
  inputMode: InputMode;
  value: string;
  placeholder: string;
  secure: boolean;
  capabilities: Capability[];
  theme: Theme;
  visible: boolean;
  focusedInput: string;
}

export interface ProviderInfo {
  name: string;
  capabilities: Capability[];
}

export interface ApiError {
  error: { code: string; message: string };
}

export const PHASE1_LAYOUTS: readonly Layout[] = ["text", "number", "url"];
