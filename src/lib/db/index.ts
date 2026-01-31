import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL || `${process.cwd()}/clawchess.db`;

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };

// Run migrations automatically on startup
const migrationsFolder = path.join(process.cwd(), "drizzle");
migrate(db, { migrationsFolder });
