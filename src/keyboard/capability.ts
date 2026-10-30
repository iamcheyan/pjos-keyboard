import type { Capability, InputMode } from "../api/types";

/**
 * Capability-driven input-mode selection.
 *
 * NOTE: this deliberately takes only capabilities. There is no device-name
 * branch anywhere ("if RG34XX") — devices are described by their capabilities
 * (see DEVICE_CAPABILITIES), which is what keeps this portable to new hardware.
 */
export function selectInputMode(capabilities: readonly Capability[]): InputMode {
  if (capabilities.includes("Touch")) return "touch";
  if (capabilities.includes("DPad")) return "dpad";
  return "touch";
}

/**
 * Device capability reference used by profiles/configuration only (never by UI
 * logic). Kept here so tests can assert the mapping stays capability-based.
 */
export const DEVICE_CAPABILITIES: Readonly<Record<string, readonly Capability[]>> = {
  RG34XX: ["DPad", "Gamepad"],
  RG35XX: ["DPad", "Gamepad"],
  RG40XX: ["DPad", "Gamepad"],
  Leaf3C: ["Touch", "DPad"],
  "Android Tablet": ["Touch"],
  Desktop: ["Touch", "HardwareKeyboard"],
};

/** Resolve a device profile's capabilities; unknown devices fall back to Touch. */
export function capabilitiesForDevice(device: string): readonly Capability[] {
  return DEVICE_CAPABILITIES[device] ?? ["Touch"];
}
