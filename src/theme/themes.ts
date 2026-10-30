import type { Theme } from "../api/types";

/**
 * Theme tokens. E-Ink friendliness is a property of every theme, not a separate
 * mode: high contrast, no shadows, no gradients, and no key animations
 * (`reducedMotion` is always true here). OLED uses true black (#000).
 */
export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceFocused: string;
  text: string;
  textFocused: string;
  border: string;
  accent: string;
  accentText: string;
  /** Always true: no transitions/animations, safe for e-ink panels. */
  reducedMotion: boolean;
  /** Flat surfaces only; e-ink shows shadows as grey smears. */
  useShadow: boolean;
}

const BASE = {
  reducedMotion: true as const,
  useShadow: false as const,
};

export const THEMES: Record<Theme, ThemeTokens> = {
  light: {
    ...BASE,
    background: "#f5f5f5",
    surface: "#ffffff",
    surfaceFocused: "#d9e6f2",
    text: "#111111",
    textFocused: "#000000",
    border: "#111111",
    accent: "#0b57d0",
    accentText: "#ffffff",
  },
  dark: {
    ...BASE,
    background: "#16181c",
    surface: "#24272d",
    surfaceFocused: "#3b4350",
    text: "#f2f2f2",
    textFocused: "#ffffff",
    border: "#8a94a6",
    accent: "#8ab4f8",
    accentText: "#0b1220",
  },
  oled: {
    ...BASE,
    background: "#000000",
    surface: "#000000",
    surfaceFocused: "#1f1f1f",
    text: "#ffffff",
    textFocused: "#ffffff",
    border: "#9aa0a6",
    accent: "#ffffff",
    accentText: "#000000",
  },
};

export function themeStyle(tokens: ThemeTokens): Record<string, string | number> {
  return {
    "--kb-bg": tokens.background,
    "--kb-surface": tokens.surface,
    "--kb-surface-focused": tokens.surfaceFocused,
    "--kb-text": tokens.text,
    "--kb-text-focused": tokens.textFocused,
    "--kb-border": tokens.border,
    "--kb-accent": tokens.accent,
    "--kb-accent-text": tokens.accentText,
    boxShadow: tokens.useShadow ? "0 2px 6px rgba(0,0,0,0.35)" : "none",
    transition: tokens.reducedMotion ? "none" : "background-color 120ms linear",
  };
}
