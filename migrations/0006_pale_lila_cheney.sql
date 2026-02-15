ALTER TABLE "transaction" DROP CONSTRAINT "transaction_ledger_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_ledger_id_ledger_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledger"("id") ON DELETE no action ON UPDATE no action;