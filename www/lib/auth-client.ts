import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient()

export const socialLogin = async ({
  provider
}: {
  provider: "google" | "facebook"
}) => {
  return await authClient.signIn.social({ provider })
}

export const logout = async (onSuccess: () => void) => {
  await authClient.signOut({
    fetchOptions: {
      onSuccess
    }
  })
}

export type User = (typeof authClient.$Infer.Session)["user"]
export type Session = (typeof authClient.$Infer.Session)["session"]
