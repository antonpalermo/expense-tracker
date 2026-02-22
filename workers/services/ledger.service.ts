import { db } from "@/lib/db"
import {
  ledger,
  metadata,
  transaction,
  user,
  type InsertLedgerRequest,
  type InsertTransactionRequest
} from "@/database/schema"
import { eq } from "drizzle-orm"

export const LedgerService = {
  /**
   * creates a new ledger
   * @param data ledger data to be created
   * @returns created ledger details
   */
  async createLedger(data: InsertLedgerRequest) {
    const [ledgerData] = await db.insert(ledger).values(data).returning()
    return ledgerData
  },

  /**
   *
   * @param id
   * @returns
   */
  async getLedger(id: string) {
    const data = await db.query.ledger.findFirst({
      where: eq(ledger.id, id)
    })

    return data
  },

  /**
   * get ledgers by user id
   * @param userId ledger owner
   * @returns all user created ledgers along with the default selected.
   */
  async getUserLedgers(userId: string) {
    const data = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {},
      with: {
        ledgers: true,
        metadata: {
          columns: { defaults: true }
        }
      }
    })

    return { default: data?.metadata?.defaults?.ledger, ledgers: data?.ledgers }
  },

  /**
   * updates the default selected ledger.
   * @param userId ledger owner.
   * @param ledgerId ledger to be defaulted.
   * @returns updated metadata.
   */
  async updateDefaultLedger(userId: string, ledgerId: string) {
    const data = await db
      .update(metadata)
      .set({ defaults: { ledger: ledgerId } })
      .where(eq(metadata.userId, userId))

    return data
  },

  /**
   * creates a new transaction entry
   * @param data transaction data to be created
   * @returns created transaction details
   */
  async createTransaction(data: InsertTransactionRequest) {
    const [transactionData] = await db
      .insert(transaction)
      .values(data)
      .returning()
    return transactionData
  }
}
