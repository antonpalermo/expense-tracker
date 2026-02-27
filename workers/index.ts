import { createRoute } from "@/lib/create-route"

import { onError } from "@/middlewares/on-error"
import { authGuard } from "@/middlewares/auth-guard"

import authRoutes from "@/routes/auth"
import ledgerRoutes from "@/routes/ledger.route"
import metadataRoutes from "@/routes/metadata.route"

const app = createRoute().basePath("/api")

app.use(authGuard)
app.onError(onError)

const routes = [authRoutes, ledgerRoutes, metadataRoutes] as const

routes.forEach(route => app.route("/", route))

export default app
