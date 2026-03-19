import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./worker/database/schemas/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})
