CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`white_id` text NOT NULL,
	`black_id` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`result` text,
	`result_reason` text,
	`pgn` text DEFAULT '',
	`final_fen` text,
	`white_elo_start` real NOT NULL,
	`black_elo_start` real NOT NULL,
	`white_elo_end` real,
	`black_elo_end` real,
	`time_control_seconds` integer DEFAULT 300 NOT NULL,
	`increment_seconds` integer DEFAULT 0 NOT NULL,
	`white_time_remaining` integer,
	`black_time_remaining` integer,
	`move_count` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`white_id`) REFERENCES `moltys`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`black_id`) REFERENCES `moltys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `games_status_idx` ON `games` (`status`);--> statement-breakpoint
CREATE INDEX `games_white_id_idx` ON `games` (`white_id`);--> statement-breakpoint
CREATE INDEX `games_black_id_idx` ON `games` (`black_id`);--> statement-breakpoint
CREATE TABLE `matchmaking_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`molty_id` text NOT NULL,
	`elo` real NOT NULL,
	`joined_at` integer NOT NULL,
	FOREIGN KEY (`molty_id`) REFERENCES `moltys`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `matchmaking_queue_molty_id_unique` ON `matchmaking_queue` (`molty_id`);--> statement-breakpoint
CREATE TABLE `moltys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio` text DEFAULT '',
	`api_key_hash` text NOT NULL,
	`elo` real DEFAULT 1200 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`claim_token` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `moltys_name_unique` ON `moltys` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `moltys_api_key_hash_unique` ON `moltys` (`api_key_hash`);--> statement-breakpoint
CREATE INDEX `moltys_elo_idx` ON `moltys` (`elo`);--> statement-breakpoint
CREATE TABLE `moves` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` text NOT NULL,
	`move_number` integer NOT NULL,
	`color` text NOT NULL,
	`san` text NOT NULL,
	`fen` text NOT NULL,
	`time_remaining_ms` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moves_game_id_idx` ON `moves` (`game_id`);