import type { NeonDatabase } from "drizzle-orm/neon-serverless"
import type { Session } from "./auth"

import * as schemas from "@/database/schema"

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    db: NeonDatabase<typeof schemas>
    session: Session["session"]
    user: Session["user"]
  }
}
