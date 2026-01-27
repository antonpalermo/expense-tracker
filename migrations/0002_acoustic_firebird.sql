CREATE INDEX "ledger_id_idx" ON "ledger" USING btree ("id");--> statement-breakpoint
CREATE INDEX "ledger_userId_idx" ON "ledger" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "ledger" ADD CONSTRAINT "ledger_id_unique" UNIQUE("id");