CREATE TABLE `ledger_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text,
	`expires_at` integer NOT NULL,
	`responded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_invitations_pending_unique` ON `ledger_invitations` (`ledger_id`,`email`) WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX `ledger_invitations_email_index` ON `ledger_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `ledger_invitations_ledger_id_index` ON `ledger_invitations` (`ledger_id`);--> statement-breakpoint
CREATE TABLE `ledger_members` (
	`id` text PRIMARY KEY NOT NULL,
	`ledger_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_members_ledger_user_unique` ON `ledger_members` (`ledger_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_members_owner_unique` ON `ledger_members` (`ledger_id`) WHERE role = 'owner';--> statement-breakpoint
CREATE INDEX `ledger_members_user_id_index` ON `ledger_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ledgers_created_by_index` ON `ledgers` (`created_by`);--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`user_id` text,
	`ledger_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entries_id_unique` ON `entries` (`id`);--> statement-breakpoint
CREATE INDEX `entries_id_index` ON `entries` (`id`);--> statement-breakpoint
CREATE INDEX `entries_ledger_id_index` ON `entries` (`ledger_id`);--> statement-breakpoint
DROP TABLE `forms`;--> statement-breakpoint
CREATE TABLE `forms` (
	`id` text PRIMARY KEY NOT NULL,
	`fields` text,
	`ledger_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `forms_id_unique` ON `forms` (`id`);--> statement-breakpoint
CREATE INDEX `form_id_index` ON `forms` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `forms_ledger_id_unique` ON `forms` (`ledger_id`);
