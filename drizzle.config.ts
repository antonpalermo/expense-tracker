import { defineConfig } from "drizzle-kit"

/**
 * no need to provide db details since
 * we are only using drizzle kit to generate
 * migration files. Migration is handled by
 * wrangler.
 */
export default defineConfig({
    out: "./.migrations",
    schema: "./worker/database/schemas/*",
    dialect: "sqlite",
    driver: "d1-http"
})
