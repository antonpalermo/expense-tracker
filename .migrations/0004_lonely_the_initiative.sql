DROP INDEX `entries_form_id_index`;--> statement-breakpoint
ALTER TABLE `entries` ADD `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` ADD `description` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `amount` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `entries` DROP COLUMN `form_id`;--> statement-breakpoint
ALTER TABLE `entries` DROP COLUMN `data`;