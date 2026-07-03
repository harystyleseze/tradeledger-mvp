import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API prefixes proxied to the Express server in dev.
// The bypass returns index.html for browser page loads (Accept: text/html) so
// SPA routes that share a prefix with API routes (e.g. /admin) still render.
const API_PREFIXES = [
  "/merchants",
  "/advances",
  "/admin",
  "/buyers",
  "/simulate",
  "/webhooks",
  "/health",
];

const proxy = Object.fromEntries(
  API_PREFIXES.map((prefix) => [
    prefix,
    {
      target: "http://localhost:3001",
      bypass: (req) =>
        req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
    },
  ])
);

export default defineConfig({
  plugins: [react()],
  server: { proxy },
});
