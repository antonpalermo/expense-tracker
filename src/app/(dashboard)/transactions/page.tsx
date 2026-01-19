import { initAuth } from "@/lib/auth"
import { getDatabase, transaction } from "@/lib/database"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import TransactionTable from "./_components/transaction-table"

export default async function Transaction() {
  const db = getDatabase()
  const session = await (
    await initAuth()
  ).api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/")
  }

  const txns = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, session.user.id))

  return (
    <div>
      <TransactionTable txn={txns} />
    </div>
  )
}
