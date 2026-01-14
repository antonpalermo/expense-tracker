"use client"

import auth from "@/lib/auth-client"

export default function Home() {
  return (
    <div>
      <h1>Welcome</h1>
      <button
        onClick={async () => await auth.signIn.social({ provider: "google" })}
      >
        Sign In with Google
      </button>
    </div>
  )
}
