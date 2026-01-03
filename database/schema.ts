import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const transaction = pgTable("transactions", {
  id: uuid().unique().defaultRandom(),
  name: text(),
  description: text(),
  dateCreated: timestamp().defaultNow(),
  dateUpdated: timestamp().$onUpdate(() => new Date())
})
