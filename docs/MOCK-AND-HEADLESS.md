# Mock and headless verification

HX90 is a headless build host: no display server, no handheld, no touchscreen or
e-ink panel attached. Nothing below claims real-device touch/e-ink/DPad
verification. What *is* verified is the logic and the wiring.

## What runs where

| Layer | Verified on HX90 | Method |
|-------|------------------|--------|
| Layout contents (Text/Number/URL keys) | yes | Vitest assertions on `LAYOUTS` |
| Touch input mapping | yes | Vitest + `fireEvent.click` on rendered buttons |
| DPad mapping (D-pad/A/B/Start/Select) | yes | Vitest drives `pjos:pad` events; Chromium drives the same path |
| Capability → input mode | yes | Vitest table of device→capability→mode |
| Themes incl. OLED `#000` | yes | Vitest tokens + Chromium computed CSS vars |
| Provider ↔ keyboardd HTTP | yes | `tests/integration-input-api.mjs`, real Go binary |
| Rendered showcase in a browser | yes | Chromium (headless), real clicks + screenshots |
| Real touchscreen / e-ink panel | **no** | no hardware |
| Real evdev gamepad | **no** | no hardware; the `pjos:pad` bridge is the seam |

## Mock providers

`keyboardd` ships `stub` — an in-process provider that records `show`/`hide`/
`key`/`submit` hooks and declares the full capability superset. It exists so that:

- Go tests assert the provider chain without a UI (`TestProviderHooksFired`),
- a headless/desktop host still has a valid provider (nothing is drawn),
- a failed provider upgrade can fall back without wedging text input.

A test-only provider can be registered with `keyboardd.New(store, myProvider)`; the
manager notifies it on every state transition.

## Simulating capabilities

DPad Mode is reachable without hardware by declaring capabilities:

```sh
# Provider/host side
curl -s -X POST http://127.0.0.1:8787/api/keyboard/show \
  -d '{"layout":"text","capabilities":["DPad","Gamepad"]}'
# -> state.inputMode == "dpad"
```

In the showcase, the "Device profile" or "Capabilities" select does the same, and
the DPad debug buttons dispatch `pjos:pad` events that the provider consumes
exactly like a hardware bridge would.

## Headless browser checks performed

With `keyboardd` on a free port and `npm run dev` serving the showcase:

1. Text layout renders; tapping `h`,`i` shows `hi` and posts `POST /api/keyboard/key`.
2. Selecting `RG34XX` flips `data-input-mode` to `dpad` (capability-driven).
3. D-pad right ×2 then A composes `e` on the service; B deletes it back to `""`.
4. Select switches the rendered layout to `number`.
5. `pjos.keyboard.show` reaches the service and `GET /api/keyboard/state` reports
   the same layout/theme the UI is rendering.

Screenshots of those states were captured during verification. They prove rendering
and input mapping in Chromium at 900×950 CSS px — not a handheld panel.

## Not reproducible without hardware

- Touch latency/accuracy on a resistive or capacitive panel.
- E-ink ghosting on theme switches (mitigated by `reducedMotion` + no shadows).
- evdev axis/button numbers for a specific handheld's D-pad.
- OLED true-black on a real OLED panel (token is `#000000`).

Any claim about those would need a device run; this project does not make one.
