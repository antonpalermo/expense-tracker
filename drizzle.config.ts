import dotenv from "dotenv"
import { defineConfig } from "drizzle-kit"

dotenv.config({ path: "./.dev.vars" })

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    token: process.env.CLOUDFLARE_D1_TOKEN,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.CLOUDFLARE_D1_ID
  },
  schema: "./database/schema.ts",
  out: "./database/migrations"
})
