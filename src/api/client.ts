import type { KeyboardState, ProviderInfo, ShowOptions } from "./types";

/**
 * HTTP client for keyboardd's Input API. The keyboard provider and any app-side
 * `pjos.keyboard` binding use this; nothing renders a keyboard directly.
 */
export interface FetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === "object" && value !== null && "error" in value;
}

export class InputApiClient {
  readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(baseUrl: string = import.meta.env.VITE_KEYBOARDD_URL ?? "http://127.0.0.1:8787", fetchImpl: FetchLike = globalThis.fetch.bind(globalThis)) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const code = isErrorBody(body) ? body.error?.code ?? `http_${response.status}` : `http_${response.status}`;
      const message = isErrorBody(body) ? body.error?.message ?? response.statusText : response.statusText;
      throw Object.assign(new Error(`${code}: ${message}`), { code, status: response.status });
    }
    return body as T;
  }

  show(opts: ShowOptions = {}): Promise<{ state: KeyboardState }> {
    return this.request("/api/keyboard/show", { method: "POST", body: JSON.stringify(opts) });
  }

  hide(): Promise<{ state: KeyboardState }> {
    return this.request("/api/keyboard/hide", { method: "POST", body: "{}" });
  }

  submit(value?: string): Promise<{ value: string; state: KeyboardState }> {
    return this.request("/api/keyboard/submit", {
      method: "POST",
      body: JSON.stringify(value === undefined ? {} : { value }),
    });
  }

  focus(inputId: string, opts: ShowOptions = {}): Promise<{ state: KeyboardState }> {
    return this.request("/api/keyboard/focus", {
      method: "POST",
      body: JSON.stringify({ inputId, ...opts }),
    });
  }

  blur(inputId?: string): Promise<{ state: KeyboardState }> {
    return this.request("/api/keyboard/blur", {
      method: "POST",
      body: JSON.stringify(inputId ? { inputId } : {}),
    });
  }

  key(key: string): Promise<{ state: KeyboardState }> {
    return this.request("/api/keyboard/key", { method: "POST", body: JSON.stringify({ key }) });
  }

  state(): Promise<KeyboardState> {
    return this.request("/api/keyboard/state");
  }

  providers(): Promise<{ active: string; providers: ProviderInfo[] }> {
    return this.request("/api/keyboard/providers");
  }

  setProvider(name: string): Promise<{ state: KeyboardState }> {
    return this.request("/api/keyboard/provider", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }
}
