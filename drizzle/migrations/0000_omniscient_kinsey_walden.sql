CREATE TABLE `transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_id_unique` ON `transaction` (`id`);