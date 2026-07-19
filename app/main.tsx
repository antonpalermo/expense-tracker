import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { TanStackDevtools } from "@tanstack/react-devtools"
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRouter, RouterProvider } from "@tanstack/react-router"

import "./index.css"
import { routeTree } from "@/routeTree.gen"
import { Toaster } from "@/components/ui/sonner"

const client = new QueryClient()
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <QueryClientProvider client={client}>
            <RouterProvider router={router} />
            <ReactQueryDevtools />
            <Toaster />
        </QueryClientProvider>
        <TanStackDevtools plugins={[formDevtoolsPlugin()]} />
    </StrictMode>
)
