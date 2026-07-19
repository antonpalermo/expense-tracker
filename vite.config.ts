import { defineConfig } from "vite"

import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

import { devtools } from "@tanstack/devtools-vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import { tanstackRouter } from "@tanstack/router-plugin/vite"

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
            routesDirectory: "./app/routes",
            generatedRouteTree: "./app/routeTree.gen.ts",
            routeFileIgnorePrefix: "-"
        }),
        react(),
        devtools(),
        tailwindcss(),
        cloudflare()
    ],
    resolve: {
        tsconfigPaths: true
    }
})
