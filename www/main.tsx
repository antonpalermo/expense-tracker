import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { routeTree } from "@client/routeTree.gen"

import { Toaster } from "@client/components/ui/sonner"
import { SidebarProvider } from "@client/components/ui/sidebar"

import "@client/globals.css"

const root = document.getElementById("root") as HTMLElement
const router = createRouter({ routeTree })
const client = new QueryClient()

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <SidebarProvider>
        <RouterProvider router={router} />
        <Toaster />
      </SidebarProvider>
    </QueryClientProvider>
  </StrictMode>
)
