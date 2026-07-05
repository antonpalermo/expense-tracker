import { defineConfig } from "vite"

import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import { devtools } from "@tanstack/devtools-vite"
import { cloudflare } from "@cloudflare/vite-plugin"

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), devtools(), tailwindcss(), cloudflare()],
    resolve: {
        tsconfigPaths: true
    }
})
