import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allows "import X from '@/components/...'" throughout the codebase
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      // Required on Windows — Docker bind mounts don't fire inotify events,
      // so Vite never sees file changes without polling.
      usePolling: true,
      interval: 300,
    },
  },
});
