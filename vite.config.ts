import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const geminiApiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "";

  // Provide a safe fallback for missing API key
  const safeApiKey = geminiApiKey || "API_KEY_NOT_CONFIGURED";

  // Default base path for GitHub Pages deployment
  const base = env.VITE_BASE_URL || "/simple-ml-demo-1/";

  return {
    plugins: [react()],
    base,
    define: {
      "process.env.API_KEY": JSON.stringify(safeApiKey),
      "process.env.GEMINI_API_KEY": JSON.stringify(safeApiKey),
      "process.env.VITE_GEMINI_API_KEY": JSON.stringify(safeApiKey),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    server: {
      hmr: true,
      port: 5173,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
    worker: {
      format: "es",
      plugins: [react()],
    },
  };
});
