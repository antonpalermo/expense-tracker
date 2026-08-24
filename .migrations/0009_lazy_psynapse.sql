ALTER TABLE `entries` ADD `type` text DEFAULT 'credit' NOT NULL;--> statement-breakpoint
-- Backfill from the sign of the existing amount, which is the source of truth.
UPDATE `entries` SET `type` = 'debit' WHERE `amount` < 0;
