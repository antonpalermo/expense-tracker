import { createAuthClient } from "better-auth/react"

export const { signIn, signOut, useSession, $Infer } = createAuthClient()

export type Session = typeof $Infer.Session
