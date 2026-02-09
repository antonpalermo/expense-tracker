import { RouterProvider, createRouter } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { routeTree } from "@/routeTree.gen"
import { useSession } from "@/lib/auth"

const router = createRouter({ routeTree, context: { isAuthenticated: false } })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const client = new QueryClient()

export default function App() {
  const { data, isPending } = useSession()

  if (isPending) {
    return <h1>Loading...</h1>
  }

  return (
    <QueryClientProvider client={client}>
      <RouterProvider router={router} context={{ isAuthenticated: !!data }} />
    </QueryClientProvider>
  )
}
