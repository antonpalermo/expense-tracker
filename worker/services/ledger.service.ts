import { db } from "@workers/database/db"
import { metadata, user } from "@workers/database/schemas"
import { ledger, type LedgerInput } from "@workers/database/schemas/ledger"
import { eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"

import * as HTTPStatus from "@workers/status-codes"

export async function getLedgers(userId: string) {
  try {
    const result = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: {},
      with: {
        ledgers: true,
        metadata: {
          columns: { defauts: true }
        }
      }
    })

    if (!result) {
      throw new HTTPException(HTTPStatus.NOT_FOUND)
    }

    return {
      default: result.metadata?.defauts?.ledgerId,
      ledgers: result.ledgers
    }
  } catch (error) {
    // TODO: improve logging here.
    console.log(error)
  }
}

export async function createLedger(input: LedgerInput) {
  try {
    const result = await db
      .insert(ledger)
      .values({ ...input })
      .returning()

    return result[0]
  } catch (error) {
    // TODO: improve logging here.
    console.log(error)
  }
}

export async function updateDefaultLedger(data: {
  ledgerId: string
  userId: string
}) {
  try {
    const result = await db
      .update(metadata)
      .set({ defauts: { ledgerId: data.ledgerId } })
      .where(eq(metadata.userId, data.userId))

    return result
  } catch (error) {
    console.log(error)
  }
}
