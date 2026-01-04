import { defineConfig } from "vite"

import path from "node:path"
import react from "@vitejs/plugin-react"

import { cloudflare } from "@cloudflare/vite-plugin"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@workers": path.resolve(__dirname, "./workers")
    }
  }
})
