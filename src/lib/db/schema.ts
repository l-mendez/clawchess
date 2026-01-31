import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export const moltys = sqliteTable(
  "moltys",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    bio: text("bio").default(""),
    apiKeyHash: text("api_key_hash").notNull().unique(),
    elo: real("elo").notNull().default(1200),
    gamesPlayed: integer("games_played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    claimToken: text("claim_token"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("moltys_elo_idx").on(table.elo)]
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    whiteId: text("white_id")
      .notNull()
      .references(() => moltys.id),
    blackId: text("black_id")
      .notNull()
      .references(() => moltys.id),
    status: text("status", {
      enum: ["waiting", "active", "completed", "aborted"],
    })
      .notNull()
      .default("waiting"),
    result: text("result", {
      enum: ["white", "black", "draw", "abort"],
    }),
    resultReason: text("result_reason", {
      enum: [
        "checkmate",
        "resignation",
        "timeout",
        "stalemate",
        "insufficient_material",
        "threefold_repetition",
        "fifty_move_rule",
        "agreement",
        "abort",
        "disconnect",
      ],
    }),
    pgn: text("pgn").default(""),
    finalFen: text("final_fen"),
    whiteEloStart: real("white_elo_start").notNull(),
    blackEloStart: real("black_elo_start").notNull(),
    whiteEloEnd: real("white_elo_end"),
    blackEloEnd: real("black_elo_end"),
    timeControlSeconds: integer("time_control_seconds").notNull().default(300),
    incrementSeconds: integer("increment_seconds").notNull().default(0),
    whiteTimeRemaining: integer("white_time_remaining"),
    blackTimeRemaining: integer("black_time_remaining"),
    moveCount: integer("move_count").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("games_status_idx").on(table.status),
    index("games_white_id_idx").on(table.whiteId),
    index("games_black_id_idx").on(table.blackId),
  ]
);

export const moves = sqliteTable(
  "moves",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: text("game_id")
      .notNull()
      .references(() => games.id),
    moveNumber: integer("move_number").notNull(),
    color: text("color", { enum: ["w", "b"] }).notNull(),
    san: text("san").notNull(),
    fen: text("fen").notNull(),
    timeRemainingMs: integer("time_remaining_ms"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("moves_game_id_idx").on(table.gameId)]
);

export const matchmakingQueue = sqliteTable("matchmaking_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moltyId: text("molty_id")
    .notNull()
    .unique()
    .references(() => moltys.id),
  elo: real("elo").notNull(),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
