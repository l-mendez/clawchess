#!/usr/bin/env node
/**
 * One-time cleanup: delete old bot-vs-bot (simulator) games and their moves,
 * keeping the most recent KEEP games. Safe to run against a live database
 * whose disk is full — it deletes in small transactions and checkpoints the
 * WAL between them so the WAL file is reused instead of growing.
 *
 * Usage (on the Fly machine):
 *   cd /app && node prune-simulated-games.cjs [keep=500] [--vacuum]
 *
 * --vacuum compacts the file afterwards; it needs free disk roughly equal to
 * the compacted database size, so only use it once there is room.
 */
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_URL || "/data/clawchess.db";
const keep = parseInt(process.argv.find((a) => /^\d+$/.test(a)) || "500", 10);
const vacuum = process.argv.includes("--vacuum");

const db = new Database(DB_PATH, { fileMustExist: true });
db.pragma("busy_timeout = 10000");
db.pragma("foreign_keys = ON");

const selectStale = db.prepare(`
  SELECT id FROM games
  WHERE white_id LIKE 'bot-%' AND black_id LIKE 'bot-%'
    AND tournament_id IS NULL AND status != 'active'
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`);
const deleteMoves = db.prepare("DELETE FROM moves WHERE game_id = ?");
const deleteGame = db.prepare("DELETE FROM games WHERE id = ?");
const deleteBatch = db.transaction((ids) => {
  for (const id of ids) {
    deleteMoves.run(id);
    deleteGame.run(id);
  }
});

let batchSize = 50;
let total = 0;
const started = Date.now();

for (;;) {
  const ids = selectStale.all(batchSize, keep).map((r) => r.id);
  if (ids.length === 0) break;
  try {
    deleteBatch(ids);
    total += ids.length;
    db.pragma("wal_checkpoint(RESTART)");
    if (total % 5000 < ids.length) {
      console.log(`deleted ${total} games (${((Date.now() - started) / 1000).toFixed(0)}s)`);
    }
  } catch (err) {
    if (err.code === "SQLITE_FULL" && batchSize > 1) {
      batchSize = Math.max(1, Math.floor(batchSize / 2));
      db.pragma("wal_checkpoint(RESTART)");
      console.log(`disk full, retrying with batch size ${batchSize}`);
      continue;
    }
    throw err;
  }
}

console.log(`done: deleted ${total} games, kept ${keep} most recent`);
console.log(
  "freelist pages:",
  db.pragma("freelist_count", { simple: true }),
  "of",
  db.pragma("page_count", { simple: true })
);

if (vacuum) {
  console.log("vacuuming...");
  db.exec("VACUUM");
  db.pragma("wal_checkpoint(TRUNCATE)");
  console.log("page count after vacuum:", db.pragma("page_count", { simple: true }));
}

db.close();
