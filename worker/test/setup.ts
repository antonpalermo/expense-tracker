import { applyD1Migrations, env } from 'cloudflare:test'

beforeAll(async () => {
    await applyD1Migrations(env.DATABASE, env.TEST_MIGRATIONS)
})
