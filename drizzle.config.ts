import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./worker/database/schemas/*",
  dialect: "sqlite",
  driver: "d1-http",
  out: "./drizzle/migrations"
})
