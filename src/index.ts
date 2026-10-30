/**
 * pjos-keyboard — default KeyboardProvider for the PJOS Universal Input
 * Framework.
 *
 * Apps must not render a keyboard directly; they call the Input API through
 * `pjos.keyboard`. This package supplies both the app-facing binding and the
 * provider UI that the shell mounts.
 */
export { KeyboardProvider, PadBridge } from "./components/KeyboardProvider";
export type { KeyboardProviderProps, KeyboardViewState } from "./components/KeyboardProvider";

export { InputApiClient } from "./api/client";
export type { FetchLike } from "./api/client";
export { createPjosKeyboard, installPjosKeyboard } from "./api/pjos";
export type { PjosKeyboard } from "./api/pjos";

export type {
  Capability,
  InputMode,
  KeyboardState,
  Layout,
  ProviderInfo,
  ReservedLayout,
  ShowOptions,
  Theme,
} from "./api/types";
export { PHASE1_LAYOUTS } from "./api/types";

export { selectInputMode, capabilitiesForDevice, DEVICE_CAPABILITIES } from "./keyboard/capability";
export { moveFocus, mapPadButton, clampPoint } from "./keyboard/navigation";
export type { Direction, PadAction, PadButton, Point } from "./keyboard/navigation";

export { LAYOUTS, BACKSPACE, SPACE, ENTER, SHIFT, LAYOUT_SWITCH, resolveKey } from "./layouts";
export type { KeyDef, KeyKind, KeyRow, LayoutDef } from "./layouts";

export { THEMES, themeStyle } from "./theme/themes";
export type { ThemeTokens } from "./theme/themes";
