import { defineConfig } from "vite"

import { cloudflare } from "@cloudflare/vite-plugin"

import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare(), tsconfigPaths()]
})
