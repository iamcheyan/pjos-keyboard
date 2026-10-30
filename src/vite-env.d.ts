/// <reference types="vite/client" />

import type { PjosKeyboard } from "./api/pjos";

interface ImportMetaEnv {
  readonly VITE_KEYBOARDD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  /** PocketJS Runtime scope installed by `installPjosKeyboard`. */
  var pjos: { keyboard?: PjosKeyboard } | undefined;
}

export {};
