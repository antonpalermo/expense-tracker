import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import "./index.css"

import App from "./components/app"

const client = new QueryClient()

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <QueryClientProvider client={client}>
            <App />
        </QueryClientProvider>
    </StrictMode>
)
