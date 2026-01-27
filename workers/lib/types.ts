import type { NeonDatabase } from "drizzle-orm/neon-serverless"

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    db: NeonDatabase
  }
}
