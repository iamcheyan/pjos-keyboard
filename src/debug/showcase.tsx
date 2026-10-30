import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { KeyboardProvider, type KeyboardViewState } from "../components/KeyboardProvider";
import { InputApiClient } from "../api/client";
import { createPjosKeyboard } from "../api/pjos";
import { capabilitiesForDevice } from "../keyboard/capability";
import type { Capability, Layout, Theme } from "../api/types";

/**
 * Desktop Debug — Keyboard Showcase.
 *
 * Runs with `npm run dev` alone (no PJOS). Switch Text/Number/URL, Touch/DPad,
 * theme, and device capability profile. When keyboardd is reachable it also
 * exercises the real Input API; otherwise everything still works locally.
 */
const DEVICES = ["Desktop", "Android Tablet", "Leaf3C", "RG34XX", "RG35XX", "RG40XX"];
const LAYOUTS: Layout[] = ["text", "number", "url"];
const THEMES: Theme[] = ["light", "dark", "oled"];

function Showcase() {
  const [device, setDevice] = useState("Desktop");
  const [layout, setLayout] = useState<Layout>("text");
  const [theme, setTheme] = useState<Theme>("dark");
  const [manualCapabilities, setManualCapabilities] = useState<Capability[] | null>(null);
  const [state, setState] = useState<KeyboardViewState | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [backend, setBackend] = useState<string>("unknown");
  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_KEYBOARDD_URL ?? "http://127.0.0.1:8787");

  const client = useMemo(() => new InputApiClient(backendUrl), [backendUrl]);
  const pjos = useMemo(() => createPjosKeyboard(client), [client]);

  const capabilities = manualCapabilities ?? [...capabilitiesForDevice(device)];

  const note = (line: string) => setLog((prev) => [`${new Date().toLocaleTimeString()} ${line}`, ...prev].slice(0, 12));

  const checkBackend = async () => {
    try {
      const health = await client.state();
      setBackend(`connected (layout=${health.layout}, provider=${health.provider})`);
      note("keyboardd connected");
    } catch (error) {
      setBackend("offline (local-only debug)");
      note(`keyboardd offline: ${(error as Error).message}`);
    }
  };

  const sendViaApi = async (key: string) => {
    try {
      await client.key(key);
    } catch {
      /* offline debug: local composition still works */
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, paddingBottom: 420, background: "var(--kb-page, #111)", color: "#eee", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>PJOS Keyboard Showcase</h1>
      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 0 }}>
        Desktop Debug Mode. Devices are described by capabilities; there is no device-name branch in the keyboard.
      </p>

      <section style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, marginBottom: 12 }}>
        <label>
          Device profile{" "}
          <select
            value={device}
            onChange={(e) => {
              setDevice(e.target.value);
              setManualCapabilities(null);
            }}
          >
            {DEVICES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label>
          Layout{" "}
          <select value={layout} onChange={(e) => setLayout(e.target.value as Layout)}>
            {LAYOUTS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        <label>
          Theme{" "}
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            {THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label>
          Capabilities{" "}
          <select
            value={capabilities.join(",")}
            onChange={(e) => setManualCapabilities(e.target.value.split(",") as Capability[])}
          >
            <option value="Touch">Touch only</option>
            <option value="Touch,DPad">Touch + DPad</option>
            <option value="DPad,Gamepad">DPad + Gamepad (handheld)</option>
            <option value="Touch,HardwareKeyboard">Touch + Hardware keyboard</option>
          </select>
        </label>

        <label>
          keyboardd URL{" "}
          <input
            type="text"
            size={28}
            data-testid="backend-url"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
          />
        </label>

        <button type="button" onClick={checkBackend}>Check keyboardd</button>
        <button type="button" onClick={() => void pjos.show({ layout, theme, capabilities })}>pjos.keyboard.show</button>
        <button type="button" onClick={() => void pjos.hide()}>pjos.keyboard.hide</button>
      </section>

      <p style={{ fontSize: 12 }}>
        Backend: <strong data-testid="backend-status">{backend}</strong> · Capabilities: <code>{capabilities.join(", ")}</code> ·
        Mode: <strong data-testid="mode-status">{state?.inputMode ?? "touch"}</strong>
      </p>

      <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260 }}>
          <strong>Live state</strong>
          <pre data-testid="state-json" style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{JSON.stringify(state, null, 2)}</pre>
        </div>
        <div style={{ minWidth: 260 }}>
          <strong>Event log</strong>
          <pre style={{ fontSize: 11, whiteSpace: "pre-wrap" }}>{log.join("\n")}</pre>
        </div>
        <div style={{ minWidth: 260 }}>
          <strong>DPad debug</strong>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {(["up", "down", "left", "right", "a", "b", "start", "select"] as const).map((button) => (
              <button
                key={button}
                type="button"
                data-testid={`pad-${button}`}
                onClick={() => window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button } }))}
              >
                {button}
              </button>
            ))}
          </div>
        </div>
      </div>

      <KeyboardProvider
        layout={layout}
        theme={theme}
        capabilities={capabilities}
        placeholder={layout === "number" ? "PIN / port / code" : layout === "url" ? "https://example.com" : "Search"}
        onKey={(key) => {
          note(`key ${JSON.stringify(key)}`);
          void sendViaApi(key);
        }}
        onSubmit={(value) => {
          note(`submit ${JSON.stringify(value)}`);
          void pjos.submit();
        }}
        onLayoutChange={(next) => {
          setLayout(next);
          note(`layout -> ${next}`);
        }}
        onStateChange={setState}
      />
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Showcase />
    </StrictMode>,
  );
}
