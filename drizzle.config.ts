import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./workers/database/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
