import { eq } from "drizzle-orm"

import { db } from "@/database/db"
import { metadata } from "@/database/schemas"

export const MetadataService = {
  /**
   * update the metadata defaults column value.
   * @param id The userId of the record to update.
   * @param value The new value to be set.
   * @returns updated metadata defaults
   */
  async updateDefault(id: string, ledger: string) {
    try {
      const [result] = await db
        .update(metadata)
        .set({
          defaults: { ledger }
        })
        .where(eq(metadata.userId, id))
        .returning()

      return result
    } catch (error) {
      console.log(error)
    }
  }
}
