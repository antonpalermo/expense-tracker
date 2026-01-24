import { defineConfig } from "vite"

import { tanstackRouter } from "@tanstack/router-plugin/vite"

import react from "@vitejs/plugin-react"
import unfonts from "unplugin-fonts/vite"
import tsconfigPaths from "vite-tsconfig-paths"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true
    }),
    unfonts({
      google: {
        families: ["Inter"],
        display: "swap"
      }
    }),
    tsconfigPaths(),
    react()
  ]
})
