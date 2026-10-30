# Verification — pjos-keyboard @ 2026-10-31

- Verdict: PASS
- Commit: `d2aa780654816afe586585cdd9264ceeef3e3973` (screenshot harness + favicon; this document is the following commit)
- Remote: `d2aa780654816afe586585cdd9264ceeef3e3973`
- Runtime: `vite preview` of the production bundle on `http://127.0.0.1:5199` (showcase; no keyboardd needed for the provider UI)
- Toolchain: node v22.23.3, Chrome 155.0.8059.84, TypeScript 5.6.3, Vite 5.4.21

## Test gate
| command | result | notes |
|---|---|---|
| `npm run typecheck` | PASS | `tsc --noEmit` |
| `npm test` (vitest) | PASS | 44 tests in 2 files (layouts, navigation, capability, themes, component, API client) |
| `npm run build` | PASS | Vite production bundle |
| `npm run build:lib` | PASS | `dist-lib/index.mjs`, 17.1 kb |
| `npm run verify` | PASS | all of the above chained |

## Screenshot matrix
10 states captured this run by the new `npm run screenshots`
(`scripts/capture-screenshots.mjs`, puppeteer-core + system Chrome). The script drives the real
showcase selects (device profile, layout, theme, capabilities) and the DPad simulation buttons,
then asserts the rendered mode (`touch` vs `dpad`) from the status line. It fails on duplicate
hashes, wrong PNG sizes, horizontal overflow, a missing keyboard surface, or any console/HTTP
error; `docs/screenshots/manifest.json` records the timestamp and per-file SHA-256.

| file | viewport | theme | path | state |
|---|---|---|---|---|
| text-light-touch-1280x720.png | 1280×720 | light | `docs/screenshots/text-light-touch-1280x720.png` | text, Touch, mode touch, dpad 0 |
| text-dark-touch-1280x720.png | 1280×720 | dark | `docs/screenshots/text-dark-touch-1280x720.png` | text, Touch, mode touch, dpad 0 |
| text-oled-touch-1280x720.png | 1280×720 | oled | `docs/screenshots/text-oled-touch-1280x720.png` | text, Touch, mode touch, dpad 0 |
| text-dark-dpad-1280x720.png | 1280×720 | dark | `docs/screenshots/text-dark-dpad-1280x720.png` | text, DPad,Gamepad, mode dpad, dpad 3 |
| number-dark-touch-1280x720.png | 1280×720 | dark | `docs/screenshots/number-dark-touch-1280x720.png` | number, Touch, mode touch, dpad 0 |
| url-light-touch-1280x720.png | 1280×720 | light | `docs/screenshots/url-light-touch-1280x720.png` | url, Touch, mode touch, dpad 0 |
| text-light-touch-320x240.png | 320×240 | light | `docs/screenshots/text-light-touch-320x240.png` | text, Touch, mode touch, dpad 0 |
| text-dark-dpad-480x320.png | 480×320 | dark | `docs/screenshots/text-dark-dpad-480x320.png` | text, DPad,Gamepad, mode dpad, dpad 2 |
| text-light-touch-640x480.png | 640×480 | light | `docs/screenshots/text-light-touch-640x480.png` | text, Touch,DPad, mode touch, dpad 0 |
| text-dark-touch-720x720.png | 720×720 | dark | `docs/screenshots/text-dark-touch-720x720.png` | text, Touch, mode touch, dpad 0 |

Count: 10 screenshots, 10 unique hashes (0 duplicates). `tools/check_shots.py`: all PNGs valid,
dimensions match, minimum per-image RGB stddev 65.63, no blank frames.

## Fixed
- There was no screenshot harness and no screenshot directory at all. → added
  `scripts/capture-screenshots.mjs` + `npm run screenshots`, 10 states across layouts/themes/
  modes/viewports with hash/size/overflow/mode/console gates and a manifest, and a README
  section → `scripts/capture-screenshots.mjs`, `package.json`, `README.md`.
- Every page logged a console 404 for `/favicon.ico`. → added `public/favicon.svg` and the
  `<link rel="icon">` in `index.html`; the capture now ends with "no console errors".
- README claimed 43 unit tests while vitest runs 44. → corrected to 44.
- Added `puppeteer-core` as a devDependency so the harness is reproducible with `npm ci`
  (it only drives the system Chrome; no browser download).

## Blocked / open questions
- `keyboardd` was not started, so the live `pjos.keyboard.*` HTTP round-trip is not exercised
  here; the showcase drives the provider component directly. The provider/API client are covered
  by the 44 unit tests, and `Check keyboardd` honestly reports the backend as unknown/offline.

## Not verified here
- 掌机真机（RG34XX / PJOS-LINUX）未验证；本轮只在本机 headless Chrome 里跑真实进程。
- Real touch/DPad hardware and real keyboardd integration.
