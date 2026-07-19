import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tanstackRouter({
            target: 'react',
            autoCodeSplitting: true,
            routesDirectory: './app/routes',
            generatedRouteTree: './app/routeTree.gen.ts',
            routeFileIgnorePrefix: '-'
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
