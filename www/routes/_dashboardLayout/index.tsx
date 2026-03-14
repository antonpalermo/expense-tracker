import {
  createFileRoute,
  redirect,
  useLocation,
  useNavigate
} from "@tanstack/react-router"

import App from "@client/components/app"
import { authClient, logout } from "@client/lib/auth-client"
import LedgerDialog from "@client/components/ledger-dialog"
import useLedgers from "@client/hooks/use-ledgers"
// import LedgerSelector from "@client/components/ledger-selector"

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

  const { data, isPending } = useLedgers()

  if (isPending) {
    // TODO: use skeleton here
    return <h1>Loading...</h1>
  }

  return (
    <div>
      {JSON.stringify(data)}
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
