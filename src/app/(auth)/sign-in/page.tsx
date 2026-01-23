"use client"
import { use } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import auth from "@/lib/auth-client"

export default function SignInPage({
  className,
  searchParams,
  ...props
}: React.ComponentProps<"div"> & {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const callback = use(searchParams).callback as string

  async function socialSignIn(provider: "google") {
    await auth.signIn.social({
      provider,
      callbackURL: callback ? callback : "/"
    })
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Sign in to access your account
        </p>
      </div>
      <Button onClick={async () => await socialSignIn("google")}>
        Sign in with Google
      </Button>
    </div>
  )
}
