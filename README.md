# pjos-keyboard

Default **KeyboardProvider** for the [PJOS Universal Input Framework](https://github.com/iamcheyan/pjos-input-framework).
It renders the on-screen keyboard and implements Touch/DPad navigation. Apps never
mount or drive it directly; they call the Input API (`pjos.keyboard.*`), which
`keyboardd` serves.

TypeScript + React + Vite (not Electron). Pure browser code: it talks to
`keyboardd` over loopback HTTP, so the same bundle runs in the PocketJS host, the
desktop debug page, and headless tests.

## Quick start (Desktop Debug — no PJOS needed)

```sh
npm install
npm run dev          # http://127.0.0.1:5199 — Keyboard Showcase
```

Start `keyboardd` for the full loop (from `PJOS-LINUX/runtime/keyboardd`):

```sh
go run ./cmd/keyboardd                      # 127.0.0.1:8787
VITE_KEYBOARDD_URL=http://127.0.0.1:18787 npm run dev
```

The showcase lets you switch Text/Number/URL, Touch/DPad, Light/Dark/OLED, device
capability profiles, and drive DPad buttons — with a live state dump and event log.

## Layouts

| Layout | Keys |
|--------|------|
| `text`   | QWERTY three rows + shift, backspace, space, enter |
| `number` | 1–9, 0 + backspace (passwords/PINs/SSH ports/codes; use `secure: true` to mask) |
| `url`    | text layout + `.com` `/` `:` `@` `.` |

`search`/`password`/`emoji`/`voice`/`ai` are reserved — `keyboardd` answers 501.

## Navigation (capability-driven)

Mode is derived from capabilities only; there is **no** `if (device === "RG34XX")`
anywhere in the keyboard.

| Capability | Mode |
|------------|------|
| `Touch` | Touch Mode — tap to input/delete/confirm |
| `DPad`/`Gamepad` (no Touch) | DPad Mode — D-pad moves focus, A confirm, B delete, Start finish, Select switch layout |
| `HardwareKeyboard` | physical keystrokes feed the same key path |

Device → capabilities reference (config only): `RG34XX`/`RG35XX`/`RG40XX` →
`DPad,Gamepad`; `Leaf3C` → `Touch,DPad`; `Android Tablet` → `Touch`; `Desktop` →
`Touch,HardwareKeyboard`.

## Themes

`light`, `dark`, `oled` (true black `#000`). There is no separate E-Ink mode:
every theme is e-ink friendly by construction — `reducedMotion: true`, no shadows,
no gradients, high contrast.

## App usage

```ts
import { installPjosKeyboard } from "pjos-keyboard";

installPjosKeyboard();            // installs globalThis.pjos.keyboard

await pjos.keyboard.show({ layout: "text", placeholder: "Search" });
const value = await pjos.keyboard.submit();
```

Mounting the provider (the shell does this, not the app):

```tsx
import { KeyboardProvider } from "pjos-keyboard";

<KeyboardProvider
  layout="text"
  capabilities={["Touch"]}
  theme="dark"
  onKey={(key) => void client.key(key)}
  onSubmit={(value) => void client.submit(value)}
/>
```

## Test

```sh
npm test          # 43 unit tests: layouts, navigation, capability, themes, component, API client
npm run typecheck
npm run build
npm run pack:keyboard   # -> keyboard.pkg
```

## Packaging

See [`docs/PACKAGING.md`](docs/PACKAGING.md) for the `keyboard.pkg` format and the
install flow. `keyboard.pj` (PocketJS-native) is reserved for a future ABI.

## Known limits

- Phase 1 has no pinyin/wubi/Japanese/voice/AI/predictive/emoji/swipe input; those
  belong to future external providers (Fcitx/Rime/Mozc/Voice).
- No real touchscreen/e-ink/DPad hardware has been exercised — verification is
  mock providers plus headless Chromium (see the framework docs).
- DPad gamepad transport is a `pjos:pad` window event; a device bridge maps evdev
  to it.
