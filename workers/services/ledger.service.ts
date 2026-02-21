import { db } from "@/lib/db"
import {
  ledger,
  transaction,
  type InsertLedgerRequest,
  type InsertTransactionRequest
} from "@/database/schema"

export const LedgerService = {
  async createLedger(data: InsertLedgerRequest) {
    const [ledgerData] = await db.insert(ledger).values(data).returning()
    return ledgerData
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
