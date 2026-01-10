import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"

import { signOut } from "../lib/auth"

export const Route = createFileRoute("/about")({
  component: About,
  beforeLoad: ({ context, location }) => {
    if (!context.isAuthenticated) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: location.pathname
        }
      })
    }
  }
})

function About() {
  const navigate = useNavigate({ from: "/about" })

  return (
    <div className="p-2">
      <h1>Hello from /about</h1>
      <button
        onClick={async () =>
          await signOut({
            fetchOptions: {
              onSuccess: () => {
                navigate({ to: "/sign-in", search: { redirect: "/" } })
              }
            }
          })
        }
      >
        Sign Out
      </button>
    </div>
  )
}
