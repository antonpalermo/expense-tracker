import auth from "@workers/lib/auth"

export type Session = typeof auth.$Infer.Session

export type AppBindings = {
  Bindings: CloudflareBindings
  Variables: {
    user: Session["user"]
    session: Session["session"]
  }
}
