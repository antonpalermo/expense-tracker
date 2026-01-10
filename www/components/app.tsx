import { createRouter, RouterProvider } from "@tanstack/react-router"

import { useSession } from "../lib/auth"
import { routeTree } from "../routeTree.gen"

const router = createRouter({
  routeTree,
  context: {
    isAuthenticated: false,
    user: null
  }
})

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export function App() {
  const { data, isPending } = useSession()

  if (isPending) {
    return null
  }

  return (
    <RouterProvider
      router={router}
      context={{ isAuthenticated: !!data, user: data?.user }}
    />
  )
}
