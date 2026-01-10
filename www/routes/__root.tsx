import {
  createRootRouteWithContext,
  Link,
  Outlet
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import { type Session } from "../lib/auth"

export type RouteContext = {
  isAuthenticated: boolean
  user: Session["user"] | null
}

const RootLayout = () => (
  <>
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{" "}
      <Link to="/about" className="[&.active]:font-bold">
        About
      </Link>
    </div>
    <hr />
    <Outlet />
    <TanStackRouterDevtools />
  </>
)

export const Route = createRootRouteWithContext<RouteContext>()({
  component: RootLayout
})
