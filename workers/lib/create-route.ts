import { Hono } from "hono"
import { type AppBindings } from "./types"

export function createRoute() {
  return new Hono<AppBindings>({
    strict: false
  })
}
