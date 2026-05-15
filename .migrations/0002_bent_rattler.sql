CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`form_id` text,
	`data` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_id_unique` ON `entries` (`id`);