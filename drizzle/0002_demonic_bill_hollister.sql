ALTER TABLE `entry` RENAME COLUMN "name" TO "description";--> statement-breakpoint
ALTER TABLE `entry` ADD `amount` real NOT NULL;