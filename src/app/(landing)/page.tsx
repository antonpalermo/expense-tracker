"use client"

import { Button } from "@/components/ui/button"
import auth from "@/lib/auth-client"

export default function Home() {
  return (
    <div>
      <h1>Welcome</h1>
      <Button variant={"ghost"}
        onClick={async () => await auth.signIn.social({ provider: "google" })}
      >
        Sign In with Google
      </Button>
    </div>
  )
}
