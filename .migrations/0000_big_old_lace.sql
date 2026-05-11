CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`schema` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_id_unique` ON `forms` (`id`);