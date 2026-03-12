import {
  createFileRoute,
  redirect,
  useLocation,
  useNavigate
} from "@tanstack/react-router"

import App from "@client/components/app"
import { authClient, logout } from "@client/lib/auth-client"
import LedgerDialog from "@client/components/ledger-dialog"

export const Route = createFileRoute("/_dashboardLayout/")({
  component: RouteComponent,
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession()

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href
        },
        replace: true
      })
    }
  }
})

function RouteComponent() {
  const href = useLocation({
    select: location => location.href
  })
  const navigate = useNavigate({
    from: "/"
  })

  return (
    <div>
      <LedgerDialog />
      <App />
      <button
        onClick={async () =>
          await logout(() => {
            navigate({ to: "/login", search: { redirect: href } })
          })
        }
      >
        Sign Out
      </button>
    </div>
  )
}
