import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { TanStackDevtools } from "@tanstack/react-devtools"
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import "./index.css"

import App from "./components/app"

const client = new QueryClient()

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <QueryClientProvider client={client}>
            <App />
            <ReactQueryDevtools />
        </QueryClientProvider>
        <TanStackDevtools plugins={[formDevtoolsPlugin()]} />
    </StrictMode>
)
