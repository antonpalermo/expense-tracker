CREATE TABLE `metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`defauts` blob,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metadata_id_unique` ON `metadata` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `metadata_user_id_unique` ON `metadata` (`user_id`);--> statement-breakpoint
CREATE INDEX `metadata_userId_idx` ON `metadata` (`user_id`);