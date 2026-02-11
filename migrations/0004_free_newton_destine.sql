DROP INDEX "metadata_userId_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "metadata_userId_unique_idx" ON "metadata" USING btree ("user_id");