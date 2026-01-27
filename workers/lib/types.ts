import type { NeonDatabase } from "drizzle-orm/neon-serverless"
import type { Session } from "./auth"

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    db: NeonDatabase
    session: Session | null
  }
}
