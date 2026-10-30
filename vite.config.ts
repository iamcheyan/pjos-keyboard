import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Desktop Debug: `npm run dev` serves the Keyboard Showcase standalone.
// The showcase talks to keyboardd over loopback; set VITE_KEYBOARDD_URL to
// point elsewhere. No PJOS installation is required.
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5199 },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
  },
});
