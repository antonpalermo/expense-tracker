PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_metadata` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`defaults` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_metadata`("id", "user_id", "defaults", "created_at", "updated_at") SELECT "id", "user_id", "defaults", "created_at", "updated_at" FROM `metadata`;--> statement-breakpoint
DROP TABLE `metadata`;--> statement-breakpoint
ALTER TABLE `__new_metadata` RENAME TO `metadata`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `metadata_id_unique` ON `metadata` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `metadata_user_id_unique` ON `metadata` (`user_id`);--> statement-breakpoint
CREATE INDEX `metadata_userId_idx` ON `metadata` (`user_id`);