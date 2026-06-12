PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_entries`("id", "name", "description", "amount", "created_at", "updated_at") SELECT "id", "name", "description", "amount", "created_at", "updated_at" FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `entries_id_unique` ON `entries` (`id`);--> statement-breakpoint
CREATE INDEX `entries_id_index` ON `entries` (`id`);