import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function resolveBasePath(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "/";
  }

  const trimmed = value.trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig({
  base: resolveBasePath(process.env.VITE_BASE_PATH),
  plugins: [react()],
  optimizeDeps: {
    entries: ["index.html"],
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
    watch: {
      ignored: ["**/llama.cpp/**", "**/models/**", "**/.llama-tools/**"],
    },
  },
});
