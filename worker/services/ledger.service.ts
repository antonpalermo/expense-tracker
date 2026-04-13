import type z from "zod"
import { eq } from "drizzle-orm"

import { db } from "@workers/database/db"
import {
  ledger as ledgerSchema,
  metadata as metadataSchema,
  insertLedgerSchema
} from "@workers/database/schemas"
import type { Cradle } from "@workers/container"

export class LedgerService {
  private readonly userService: Cradle["userService"]

  constructor({ userService }: Cradle) {
    this.userService = userService
  }

  async createLedger(details: z.infer<typeof insertLedgerSchema>) {
    const [ledger] = await db.insert(ledgerSchema).values(details).returning()
    return ledger
  }

  async getLedger(id: string) {
    return await db.query.ledger.findFirst({
      where: eq(ledgerSchema.id, id),
      with: { entries: true } // <- only return entries for the past 30 days.
    })
  }

  async setLedger(id: string) {
    const user = this.userService.getUser()

    return await db
      .insert(metadataSchema)
      .values({ userId: user.id, defaults: { ledgerId: id } })
      .onConflictDoUpdate({
        set: { defaults: { ledgerId: id } },
        target: eq(metadataSchema.userId, user.id)
      })
  }

  async getLedgers() {
    const user = this.userService.getUser()

    return await db
      .select()
      .from(ledgerSchema)
      .where(eq(ledgerSchema.userId, user.id))
  }
}
