import {
  createFileRoute,
  redirect,
  useLocation,
  useNavigate
} from "@tanstack/react-router"
import { signOut } from "@/lib/auth"
import LedgerCreateForm from "@/components/ledgers/create-form"

export const Route = createFileRoute("/_dashboard/")({
  component: HomePage,
  beforeLoad: async ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href
        }
      })
    }
  }
})

function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const logout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({
            to: "/login",
            search: {
              redirect: location.href
            }
          })
        }
      }
    })
  }

  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
      <LedgerCreateForm />
      <button onClick={logout}>Logout</button>
    </div>
  )
}
