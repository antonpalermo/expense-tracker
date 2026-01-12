import type { NeonDatabase } from "drizzle-orm/neon-serverless"
import type { Session } from "./configure-better-auth"

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    db: NeonDatabase
    user: Session["user"] | null
  }
}
