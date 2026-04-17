import type { Cradle } from "@workers/container"
import { db } from "@workers/database/db"
import { metadata, type insertMetadataSchema } from "@workers/database/schemas"
import type z from "zod"

export class MetadataService {
  private readonly userService: Cradle["userService"]

  constructor({ userService }: Cradle) {
    this.userService = userService
  }

  async upsertDefaults(data: z.infer<typeof insertMetadataSchema>) {
    const currentUser = this.userService.getUser()

    const [result] = await db
      .insert(metadata)
      .values({ userId: currentUser.id, ...data })
      .onConflictDoUpdate({
        set: { ...data },
        target: metadata.userId
      })
      .returning()

    return result
  }
}
