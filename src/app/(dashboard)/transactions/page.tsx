import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { eq } from "drizzle-orm"

import { initAuth } from "@/lib/auth"
import { getDatabaseAsync, transaction } from "@/lib/database"

export default async function Transaction() {
  const db = await getDatabaseAsync()
  const auth = await initAuth()

  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/")
  }

  const txns = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, session.user.id))

  return <div></div>
}
