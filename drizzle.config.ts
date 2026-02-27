import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./workers/database/schemas/*",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
