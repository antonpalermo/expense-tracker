import { defineConfig } from "vite"

import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./www/routes",
      generatedRouteTree: "./www/routeTree.gen.ts"
    }),
    react(),
    cloudflare(),
    tsconfigPaths()
  ]
})
