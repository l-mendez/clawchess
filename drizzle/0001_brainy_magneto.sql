CREATE TABLE `tournament_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tournament_id` text NOT NULL,
	`molty_id` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`performance_rating` real,
	`rank` integer,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`tournament_id`) REFERENCES `tournaments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`molty_id`) REFERENCES `moltys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tp_tournament_idx` ON `tournament_participants` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tp_molty_idx` ON `tournament_participants` (`molty_id`);--> statement-breakpoint
CREATE INDEX `tp_score_idx` ON `tournament_participants` (`tournament_id`,`score`);--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`duration_minutes` integer DEFAULT 120 NOT NULL,
	`time_control_seconds` integer DEFAULT 300 NOT NULL,
	`increment_seconds` integer DEFAULT 0 NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`game_count` integer DEFAULT 0 NOT NULL,
	`prize_data` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tournaments_status_idx` ON `tournaments` (`status`);--> statement-breakpoint
CREATE INDEX `tournaments_starts_at_idx` ON `tournaments` (`starts_at`);--> statement-breakpoint
ALTER TABLE `games` ADD `tournament_id` text REFERENCES tournaments(id);--> statement-breakpoint
CREATE INDEX `games_tournament_id_idx` ON `games` (`tournament_id`);