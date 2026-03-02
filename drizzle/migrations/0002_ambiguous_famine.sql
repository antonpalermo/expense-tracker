ALTER TABLE `transaction` RENAME TO `entry`;--> statement-breakpoint
DROP INDEX `transaction_id_unique`;--> statement-breakpoint
ALTER TABLE `entry` ADD `user_id` text NOT NULL REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `entry` ADD `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `entry` ADD `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `entry_id_unique` ON `entry` (`id`);--> statement-breakpoint
CREATE INDEX `entry_userId_idx` ON `entry` (`user_id`);