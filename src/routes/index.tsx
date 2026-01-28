import {
  createFileRoute,
  redirect,
  useLocation,
  useNavigate
} from "@tanstack/react-router"
import { signOut } from "../lib/auth"

export const Route = createFileRoute("/")({
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

  const createLedger = async () => {
    const request = await fetch("/api/ledgers/create", {
      method: "POST"
    })

    if (!request.ok) {
      console.log("not okay, unable to create ledger")
    }

    const response = await request.json()
    console.log("result", response)
  }

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
      <button onClick={createLedger}>Create</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
