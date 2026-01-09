import { defineConfig } from "vite"

import path from "node:path"
import react from "@vitejs/plugin-react"

import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

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
    cloudflare()
  ],
  resolve: {
    alias: {
      "@workers": path.resolve(__dirname, "./workers")
    }
  },
  optimizeDeps: {
    exclude: ["@tanstack/react-router-devtools"]
  }
})
