CREATE TABLE `ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_id_unique` ON `ledger` (`id`);--> statement-breakpoint
CREATE INDEX `ledger_userId_idx` ON `ledger` (`user_id`);--> statement-breakpoint
ALTER TABLE `entry` ADD `ledger_id` text NOT NULL REFERENCES ledger(id);--> statement-breakpoint
CREATE INDEX `entry_ledgerId_idx` ON `entry` (`ledger_id`);