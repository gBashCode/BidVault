CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`event` text NOT NULL,
	`actor` text NOT NULL,
	`hash` text NOT NULL,
	`timestamp` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bids` (
	`id` text PRIMARY KEY NOT NULL,
	`tender_id` text NOT NULL,
	`vendor_id` text NOT NULL,
	`commit_hash` text NOT NULL,
	`size_mb` real NOT NULL,
	`object_key` text NOT NULL,
	`status` text DEFAULT 'Sealed' NOT NULL,
	`submitted_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tenders` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`creator_id` text NOT NULL,
	`reveal_deadline` integer NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenders_reference_unique` ON `tenders` (`reference`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`organization` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);