import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { KeyboardProvider } from "../src/components/KeyboardProvider";
import { InputApiClient, type FetchLike } from "../src/api/client";
import { createPjosKeyboard, installPjosKeyboard } from "../src/api/pjos";

describe("KeyboardProvider rendering", () => {
  it("renders the text layout with QWERTY rows", () => {
    render(<KeyboardProvider layout="text" capabilities={["Touch"]} />);
    const kb = screen.getByTestId("pjos-keyboard");
    expect(kb).toHaveAttribute("data-layout", "text");
    expect(kb).toHaveAttribute("data-input-mode", "touch");
    for (const ch of ["q", "w", "a", "z", "m"]) {
      expect(screen.getByRole("button", { name: ch })).toBeInTheDocument();
    }
  });

  it("renders number layout digits", () => {
    render(<KeyboardProvider layout="number" capabilities={["Touch"]} />);
    for (const d of "1234567890") {
      expect(screen.getByRole("button", { name: d })).toBeInTheDocument();
    }
  });

  it("renders url layout with .com / : @", () => {
    render(<KeyboardProvider layout="url" capabilities={["Touch"]} />);
    for (const k of [".com", "/", ":", "@"]) {
      expect(screen.getByRole("button", { name: k })).toBeInTheDocument();
    }
  });

  it("selects DPad mode from DPad capability and shows DPad help", () => {
    render(<KeyboardProvider layout="text" capabilities={["DPad", "Gamepad"]} />);
    expect(screen.getByTestId("pjos-keyboard")).toHaveAttribute("data-input-mode", "dpad");
    expect(screen.getByTestId("dpad-help")).toBeInTheDocument();
  });

  it("applies theme tokens including true black OLED", () => {
    render(<KeyboardProvider theme="oled" capabilities={["Touch"]} />);
    const kb = screen.getByTestId("pjos-keyboard");
    expect(kb).toHaveAttribute("data-theme", "oled");
    expect(kb.style.getPropertyValue("--kb-bg")).toBe("#000000");
  });

  it("masks the value when secure", () => {
    render(<KeyboardProvider value="1234" secure capabilities={["Touch"]} />);
    expect(screen.getByTestId("keyboard-value").textContent).toBe("••••");
  });

  it("touch: tapping keys composes a value and reports keys", () => {
    const onKey = vi.fn();
    render(<KeyboardProvider capabilities={["Touch"]} onKey={onKey} />);
    fireEvent.click(screen.getByRole("button", { name: "h" }));
    fireEvent.click(screen.getByRole("button", { name: "i" }));
    expect(screen.getByTestId("keyboard-value").textContent).toBe("hi");
    expect(onKey).toHaveBeenNthCalledWith(1, "h");
    expect(onKey).toHaveBeenNthCalledWith(2, "i");
  });

  it("backspace removes the last character", () => {
    const onKey = vi.fn();
    render(<KeyboardProvider capabilities={["Touch"]} onKey={onKey} />);
    fireEvent.click(screen.getByRole("button", { name: "a" }));
    fireEvent.click(screen.getByRole("button", { name: "b" }));
    fireEvent.click(screen.getByRole("button", { name: "Backspace" }));
    expect(screen.getByTestId("keyboard-value").textContent).toBe("a");
    expect(onKey).toHaveBeenLastCalledWith("backspace");
  });

  it("submit reports the composed value", () => {
    const onSubmit = vi.fn();
    render(<KeyboardProvider capabilities={["Touch"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "x" }));
    fireEvent.click(screen.getByTestId("keyboard-submit"));
    expect(onSubmit).toHaveBeenCalledWith("x");
  });

  it("hide removes the keyboard from view", () => {
    const onHide = vi.fn();
    render(<KeyboardProvider capabilities={["Touch"]} onHide={onHide} />);
    fireEvent.click(screen.getByTestId("keyboard-hide"));
    expect(onHide).toHaveBeenCalled();
    expect(screen.queryByTestId("pjos-keyboard")).not.toBeInTheDocument();
  });

  it("shift uppercases the next letter", () => {
    render(<KeyboardProvider capabilities={["Touch"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Shift" }));
    // Once shift is armed the key's label (aria-label falls back to it) is "A".
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(screen.getByTestId("keyboard-value").textContent).toBe("A");
  });
});

describe("KeyboardProvider DPad navigation", () => {
  it("D-pad moves focus and A confirms the focused key", () => {
    const onKey = vi.fn();
    render(<KeyboardProvider capabilities={["DPad"]} onKey={onKey} />);
    // initial focus is q (row 0, col 0); move right twice -> e
    act(() => {
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "right" } }));
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "right" } }));
    });
    act(() => {
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "a" } }));
    });
    expect(onKey).toHaveBeenCalledWith("e");
  });

  it("A confirms q at the initial focus", () => {
    const onKey = vi.fn();
    render(<KeyboardProvider capabilities={["DPad"]} onKey={onKey} />);
    act(() => {
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "a" } }));
    });
    expect(onKey).toHaveBeenCalledWith("q");
  });

  it("B deletes through the same path as backspace", () => {
    const onKey = vi.fn();
    render(<KeyboardProvider capabilities={["DPad"]} onKey={onKey} />);
    fireEvent.click(screen.getByRole("button", { name: "a" }));
    act(() => {
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "b" } }));
    });
    expect(onKey).toHaveBeenLastCalledWith("backspace");
  });

  it("Start finishes (submits)", () => {
    const onSubmit = vi.fn();
    render(<KeyboardProvider capabilities={["DPad"]} onSubmit={onSubmit} />);
    act(() => {
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "start" } }));
    });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("Select switches layout", () => {
    const onLayoutChange = vi.fn();
    render(<KeyboardProvider capabilities={["DPad"]} onLayoutChange={onLayoutChange} />);
    act(() => {
      window.dispatchEvent(new CustomEvent("pjos:pad", { detail: { button: "select" } }));
    });
    expect(onLayoutChange).toHaveBeenCalledWith("number");
  });

  it("focused key is exposed for accessibility state", () => {
    render(<KeyboardProvider capabilities={["DPad"]} />);
    const q = screen.getByRole("button", { name: "q" });
    expect(q).toHaveAttribute("data-focused", "true");
  });
});

describe("InputApiClient", () => {
  const mockFetch = (handler: (url: string, init?: RequestInit) => Response): FetchLike => {
    return vi.fn(async (url: string, init?: RequestInit) => handler(url, init));
  };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("POSTs show with the layout and returns state", async () => {
    let seen: RequestInit | undefined;
    const client = new InputApiClient("http://127.0.0.1:8787", mockFetch((_u, init) => {
      seen = init;
      return json({ state: { visible: true, layout: "text" } });
    }));
    const res = await client.show({ layout: "text" });
    expect(JSON.parse(String(seen?.body))).toEqual({ layout: "text" });
    expect(res.state.visible).toBe(true);
  });

  it("resolves submit value", async () => {
    const client = new InputApiClient("http://x", mockFetch(() => json({ value: "hello", state: {} })));
    await expect(client.submit()).resolves.toMatchObject({ value: "hello" });
  });

  it("surfaces API error codes", async () => {
    const client = new InputApiClient("http://x", mockFetch(() => json({ error: { code: "invalid_layout", message: "bad" } }, 400)));
    await expect(client.show({ layout: "text" })).rejects.toMatchObject({ code: "invalid_layout", status: 400 });
  });

  it("reads the active provider's render spec", async () => {
    interface Body { provider: string; render: { layout: string; inputMode: string } }
    const body: Body = { provider: "stub", render: { layout: "url", inputMode: "dpad" } };
    const client = new InputApiClient("http://x", mockFetch(() => json(body)));
    const rendered = await client.render();
    expect(rendered.provider).toBe("stub");
    expect(rendered.render.layout).toBe("url");
    expect(rendered.render.inputMode).toBe("dpad");
  });

  it("sends key tokens", async () => {
    let body = "";
    const client = new InputApiClient("http://x", mockFetch((_u, init) => {
      body = String(init?.body);
      return json({ state: {} });
    }));
    await client.key("backspace");
    expect(JSON.parse(body)).toEqual({ key: "backspace" });
  });
});

describe("pjos.keyboard binding", () => {
  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it("submit resolves the composed value", async () => {
    const client = new InputApiClient("http://x", vi.fn(async () => json({ value: "typed", state: {} })));
    const pjos = createPjosKeyboard(client);
    await expect(pjos.submit()).resolves.toBe("typed");
  });

  it("prompt shows a layout then resolves the value", async () => {
    const calls: string[] = [];
    const client = new InputApiClient("http://x", vi.fn(async (url: string) => {
      calls.push(url);
      return json({ value: "ok", state: {} });
    }));
    await expect(createPjosKeyboard(client).prompt({ layout: "url" })).resolves.toBe("ok");
    expect(calls).toEqual(["http://x/api/keyboard/show", "http://x/api/keyboard/submit"]);
  });

  it("installs on globalThis.pjos", () => {
    const client = new InputApiClient("http://x", vi.fn(async () => json({ state: {} })));
    const keyboard = installPjosKeyboard(createPjosKeyboard(client));
    expect(globalThis.pjos?.keyboard).toBe(keyboard);
  });
});
