import { createAuthClient } from "better-auth/react"

const { useSession, signIn, signOut } = createAuthClient()

export function App() {
  const { data, isPending } = useSession()

  if (isPending) {
    return null
  }

  async function socialSignIn(provider: "google") {
    return await signIn.social({ provider })
  }

  return (
    <div>
      <pre>Session: {JSON.stringify(data?.session, null, 2)}</pre>
      <pre>User: {JSON.stringify(data?.user, null, 2)}</pre>
      <button onClick={async () => await socialSignIn("google")}>
        Sign In with Google
      </button>
      {data && <button onClick={async () => await signOut()}>Sign Out</button>}
    </div>
  )
}
