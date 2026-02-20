import { db } from "@/lib/db"
import { transaction, type InsertTransactionRequest } from "@/database/schema"

export const LedgerService = {
  /**
   * creates a new transaction entry
   * @param data transaction data to be created
   * @returns created transaction details
   */
  async create(data: InsertTransactionRequest) {
    const [transactionData] = await db
      .insert(transaction)
      .values(data)
      .returning()
    return transactionData
  }
}
