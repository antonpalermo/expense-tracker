import { fileURLToPath } from 'node:url'
import {
    cloudflareTest,
    readD1Migrations
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations('./.migrations')

export default defineConfig({
    plugins: [
        cloudflareTest({
            wrangler: { configPath: './wrangler.jsonc' },
            miniflare: {
                bindings: {
                    TEST_MIGRATIONS: migrations,
                    BETTER_AUTH_URL: 'http://localhost:5173',
                    BETTER_AUTH_SECRET: 'test-secret',
                    GOOGLE_CLIENT_ID: 'test-google-client-id',
                    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
                    PLUNK_SECRET_KEY: 'test-plunk-secret-key',
                    PLUNK_PUBLIC_KEY: 'test-plunk-public-key'
                }
            }
        })
    ],
    test: {
        include: ['worker/**/*.test.ts'],
        setupFiles: ['./worker/test/setup.ts'],
        globals: true
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./worker', import.meta.url))
        }
    }
})
