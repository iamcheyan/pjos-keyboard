# Packaging and installation

## Artifact

`npm run build && npm run pack:keyboard` produces:

```
keyboard.pkg          gzipped tar
keyboard.pkg.sha256   sha256 of the package
```

`keyboard.pj` is the **reserved** name for a future PocketJS-native package; nothing
in this repository emits it yet, and no consumer should depend on it.

## Package layout

```
manifest.json    id/version/abi, layouts, reserved layouts, capabilities,
                 themes, Input API endpoints
dist/            built provider bundle (index.html + assets/)
README.md        run/install notes
SHA256SUMS       checksum of every file above
```

`manifest.json`:

```json
{
  "name": "keyboard",
  "id": "org.pjos.keyboard",
  "version": "0.1.0",
  "kind": "keyboard-provider",
  "provider": "PocketKeyboardProvider",
  "layouts": ["text", "number", "url"],
  "reservedLayouts": ["search", "password", "emoji", "voice", "ai"],
  "capabilities": ["Touch", "DPad", "Gamepad", "HardwareKeyboard"],
  "themes": ["light", "dark", "oled"],
  "inputApi": { "transport": "http", "defaultBaseUrl": "http://127.0.0.1:8787", "endpoints": { "...": "..." } },
  "abi": 1
}
```

## Install flow (documented, not executed on a handheld)

The HX90 build host has no display and no handheld is attached, so these steps are
**documented only**; they have not been run on real hardware.

1. Verify the artifact:

   ```sh
   sha256sum -c keyboard.pkg.sha256
   tar -tzf keyboard.pkg | head      # manifest.json, dist/, README.md, SHA256SUMS
   ```

2. Install the provider into the system app directory for the active ABI:

   ```sh
   DEST=/usr/share/pjos/keyboard/1
   rm -rf "$DEST" && mkdir -p "$DEST"
   tar -xzf keyboard.pkg -C "$DEST"
   cd "$DEST" && sha256sum -c SHA256SUMS
   ```

3. Point the shell/host at the provider (`manifest.json.entry` under `DEST`) and
   make sure `keyboardd` runs:

   ```sh
   KEYBOARDD_ADDR=127.0.0.1:8787 /usr/bin/keyboardd &
   curl -s http://127.0.0.1:8787/api/health    # {"status":"ok",...}
   ```

4. If the shell serves the provider from a different origin, keep the CORS answer
   `keyboardd` already returns (`Access-Control-Allow-Origin: *`) or front both
   with the same reverse proxy.

5. Health check: `POST /api/keyboard/show {"layout":"text"}` returns
   `state.visible: true`; `POST /api/keyboard/provider {"name":"stub"}` lists the
   active provider.

### Uninstall / rollback

```sh
rm -rf /usr/share/pjos/keyboard/1
```

Removing the provider does not touch `keyboardd`; apps keep working with the
`stub` provider (which records events but draws nothing), so a failed provider
upgrade cannot wedge text input.

## Versioning

`abi` guards the Input API contract. A provider whose `abi` the shell does not
understand must be rejected and the previous provider kept. Bump `abi` only for
breaking Input API changes; additive endpoints do not need it.
