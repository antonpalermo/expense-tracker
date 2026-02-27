import type { Session } from "./auth"

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    session: Session["session"]
    user: Session["user"]
  }
}
