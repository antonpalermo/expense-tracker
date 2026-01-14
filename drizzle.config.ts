import dotenv from "dotenv"
import { defineConfig } from "drizzle-kit"

dotenv.config({ path: "./.dev.vars" })

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL
  },
  schema: "./database/schema.ts",
  out: "./database/migrations"
})
