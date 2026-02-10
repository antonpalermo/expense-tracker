import { RouterProvider, createRouter } from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"
import { useSession } from "@/lib/auth"

import Providers from "@/components/providers"

const router = createRouter({ routeTree, context: { isAuthenticated: false } })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  const { data, isPending } = useSession()

  if (isPending) {
    return <h1>Loading...</h1>
  }

  return (
    <Providers>
      <RouterProvider router={router} context={{ isAuthenticated: !!data }} />
    </Providers>
  )
}
