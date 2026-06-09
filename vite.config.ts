import path from "node:path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

// Tauri attend un port fixe ; on expose l'hôte pour le dev mobile.
const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon-256.png", "icon-512.png"],
      manifest: {
        name: "Limier — assistant d'enquête OSINT",
        short_name: "Limier",
        description: "Recherche d'empreinte numérique en sources ouvertes, éthique et légale.",
        lang: "fr",
        theme_color: "#14181f",
        background_color: "#14181f",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
})
