import { InputApiClient } from "./client";
import type { Capability, KeyboardState, Layout, ShowOptions, Theme } from "./types";

/**
 * `pjos.keyboard` — the PocketJS Runtime binding apps use. It only forwards to
 * the Input API; apps never render or drive a keyboard themselves.
 */
export interface PjosKeyboard {
  show(opts?: ShowOptions): Promise<KeyboardState>;
  hide(): Promise<KeyboardState>;
  /** Resolves with the composed value (mirrors `pjos.keyboard.submit()`). */
  submit(value?: string): Promise<string>;
  focus(inputId: string, opts?: ShowOptions): Promise<KeyboardState>;
  blur(inputId?: string): Promise<KeyboardState>;
  state(): Promise<KeyboardState>;
  /** Convenience: show a layout and resolve the composed value. */
  prompt(opts?: ShowOptions): Promise<string>;
}

export function createPjosKeyboard(client: InputApiClient = new InputApiClient()): PjosKeyboard {
  return {
    async show(opts) {
      return (await client.show(opts)).state;
    },
    async hide() {
      return (await client.hide()).state;
    },
    async submit(value) {
      return (await client.submit(value)).value;
    },
    async focus(inputId, opts) {
      return (await client.focus(inputId, opts)).state;
    },
    async blur(inputId) {
      return (await client.blur(inputId)).state;
    },
    state() {
      return client.state();
    },
    async prompt(opts) {
      await client.show(opts);
      return (await client.submit()).value;
    },
  };
}

/** Install `globalThis.pjos.keyboard` for PocketJS apps. Idempotent. */
export function installPjosKeyboard(keyboard: PjosKeyboard = createPjosKeyboard()): PjosKeyboard {
  globalThis.pjos ??= {};
  globalThis.pjos.keyboard = keyboard;
  return keyboard;
}

export type { Capability, KeyboardState, Layout, ShowOptions, Theme };
