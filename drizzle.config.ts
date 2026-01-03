import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  out: "./migrations",
  schema: "./database/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
