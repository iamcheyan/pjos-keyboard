# Device profiles and capability mapping

The keyboard never branches on a device name. Devices appear only as reference
profiles that resolve to `InputCapability` values; the UI selects Touch vs DPad
from those values. Adding a device means adding a capability row, not touching
rendering or input code.

## Capabilities

| Capability | Meaning |
|------------|---------|
| `Touch` | Touchscreen / pointer available (tap to input) |
| `DPad` | Directional pad present |
| `Gamepad` | Face/shoulder buttons (A/B/Start/Select) |
| `HardwareKeyboard` | Physical QWERTY present |

## Reference profiles

| Device | Capabilities | Resulting mode |
|--------|--------------|----------------|
| RG34XX | `DPad`, `Gamepad` | DPad |
| RG35XX | `DPad`, `Gamepad` | DPad |
| RG40XX | `DPad`, `Gamepad` | DPad |
| Leaf3C | `Touch`, `DPad` | Touch |
| Android Tablet | `Touch` | Touch |
| Desktop (Debug) | `Touch`, `HardwareKeyboard` | Touch |

Selection rule (`selectInputMode`): `Touch` wins; otherwise `DPad`; otherwise
`Touch` as the safe default. `HardwareKeyboard` never changes the mode — it feeds
physical keystrokes into the same key path as taps.

## E-Ink (Leaf3C)

There is no separate E-Ink mode. Every theme carries `reducedMotion: true` and
`useShadow: false`, so there are no transitions, gradients or shadows to smear on
an e-ink panel; contrast is expressed by the theme's text/border tokens.

## Adding a device

1. Add its capability list to `DEVICE_CAPABILITIES` (`src/keyboard/capability.ts`).
2. If it needs a distinct look, add a theme token set, not a device branch.
3. Feed the capabilities to `keyboardd` (`POST /api/keyboard/show` with
   `capabilities`) so the backend reports the same `inputMode`.
