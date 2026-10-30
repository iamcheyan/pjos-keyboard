import { describe, expect, it } from "vitest";
import { LAYOUTS, resolveKey, BACKSPACE, SHIFT } from "../src/layouts";
import { mapPadButton, moveFocus, clampPoint } from "../src/keyboard/navigation";
import { capabilitiesForDevice, selectInputMode } from "../src/keyboard/capability";
import { THEMES } from "../src/theme/themes";
import { PHASE1_LAYOUTS } from "../src/api/types";

describe("layouts", () => {
  it("implements exactly text/number/url in phase 1", () => {
    expect(Object.keys(LAYOUTS).sort()).toEqual([...PHASE1_LAYOUTS].sort());
  });

  it("text has three QWERTY letter rows plus space/backspace/enter", () => {
    const rows = LAYOUTS.text.rows;
    expect(rows[0].map((k) => k.send).join("")).toBe("qwertyuiop");
    expect(rows[1].map((k) => k.send).join("")).toBe("asdfghjkl");
    expect(rows[2].map((k) => k.send).join("")).toContain("zxcvbnm");
    const all = rows.flat().map((k) => k.id);
    expect(all).toContain("space");
    expect(all).toContain("backspace");
    expect(all).toContain("enter");
  });

  it("number layout offers 1-9 and 0 with backspace", () => {
    const keys = LAYOUTS.number.rows.flat().map((k) => k.send);
    for (const d of "1234567890") expect(keys).toContain(d);
    expect(keys).toContain("backspace");
  });

  it("url layout adds .com / : @ .", () => {
    const keys = LAYOUTS.url.rows.flat().map((k) => k.send);
    for (const extra of [".com", "/", ":", "@", "."]) expect(keys).toContain(extra);
  });

  it("shift uppercases a single letter but not symbols", () => {
    const a = LAYOUTS.text.rows.flat().find((k) => k.send === "a")!;
    expect(resolveKey(a, false).send).toBe("a");
    expect(resolveKey(a, true).send).toBe("A");
    const dot = LAYOUTS.url.rows.flat().find((k) => k.send === ".")!;
    expect(resolveKey(dot, true).send).toBe(".");
  });

  it("backspace/shift keys use control tokens", () => {
    expect(BACKSPACE.send).toBe("backspace");
    expect(SHIFT.send).toBe("shift");
  });
});

describe("capability-driven mode selection", () => {
  it("selects touch when Touch present", () => {
    expect(selectInputMode(["Touch"])).toBe("touch");
    expect(selectInputMode(["Touch", "DPad"])).toBe("touch");
  });

  it("selects dpad when only DPad-like capabilities exist", () => {
    expect(selectInputMode(["DPad"])).toBe("dpad");
    expect(selectInputMode(["DPad", "Gamepad"])).toBe("dpad");
  });

  it("falls back to touch with no capabilities", () => {
    expect(selectInputMode([])).toBe("touch");
  });

  it("maps every required device to capabilities, not names", () => {
    for (const device of ["RG34XX", "RG35XX", "RG40XX"]) {
      const caps = capabilitiesForDevice(device);
      expect(caps).toContain("DPad");
      expect(selectInputMode(caps)).toBe("dpad");
    }
    expect(selectInputMode(capabilitiesForDevice("Leaf3C"))).toBe("touch");
    expect(selectInputMode(capabilitiesForDevice("Android Tablet"))).toBe("touch");
    expect(capabilitiesForDevice("Desktop")).toContain("HardwareKeyboard");
  });
});

describe("DPad navigation", () => {
  const rows = LAYOUTS.text.rows;

  it("moves right and wraps to the next row", () => {
    const atEnd = { row: 0, col: rows[0].length - 1 };
    expect(moveFocus(rows, atEnd, "right")).toEqual({ row: 1, col: 0 });
  });

  it("moves left and wraps to the previous row end", () => {
    expect(moveFocus(rows, { row: 1, col: 0 }, "left")).toEqual({ row: 0, col: rows[0].length - 1 });
  });

  it("clamps vertical movement to shorter rows", () => {
    const shortRow = rows.length - 1;
    const clamped = moveFocus(rows, { row: shortRow, col: 99 }, "up");
    expect(clamped.col).toBeLessThan(rows[shortRow - 1].length);
  });

  it("does not move past the grid edges", () => {
    expect(moveFocus(rows, { row: 0, col: 0 }, "up")).toEqual({ row: 0, col: 0 });
    expect(moveFocus(rows, { row: rows.length - 1, col: 0 }, "down")).toMatchObject({ row: rows.length - 1 });
  });

  it("clampPoint keeps focus inside the grid", () => {
    expect(clampPoint(rows, { row: -5, col: -5 })).toEqual({ row: 0, col: 0 });
    expect(clampPoint(rows, { row: 999, col: 999 })).toMatchObject({ row: rows.length - 1 });
  });

  it("maps A=confirm, B=delete, Start=finish, Select=switch-layout", () => {
    expect(mapPadButton("a")).toEqual({ type: "confirm" });
    expect(mapPadButton("b")).toEqual({ type: "delete" });
    expect(mapPadButton("start")).toEqual({ type: "finish" });
    expect(mapPadButton("select")).toEqual({ type: "switch-layout" });
    expect(mapPadButton("left")).toEqual({ type: "move", direction: "left" });
  });
});

describe("themes", () => {
  it("provides light/dark/oled and OLED is true black", () => {
    expect(Object.keys(THEMES).sort()).toEqual(["dark", "light", "oled"]);
    expect(THEMES.oled.background).toBe("#000000");
    expect(THEMES.oled.surface).toBe("#000000");
  });

  it("all themes are e-ink friendly: no shadows, no animation", () => {
    for (const tokens of Object.values(THEMES)) {
      expect(tokens.reducedMotion).toBe(true);
      expect(tokens.useShadow).toBe(false);
    }
  });

  it("light and dark meet contrast separation between text and surface", () => {
    expect(THEMES.light.text).not.toBe(THEMES.light.surface);
    expect(THEMES.dark.text).not.toBe(THEMES.dark.surface);
  });
});
