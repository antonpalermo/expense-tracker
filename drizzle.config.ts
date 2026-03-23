import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./worker/database/schemas/*",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http"
})
