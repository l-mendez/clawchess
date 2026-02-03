import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { games, moltys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getGameManager } from "./engine";

export interface CreateGameParams {
  whiteId: string;
  blackId: string;
  whiteElo: number;
  blackElo: number;
  timeControlSeconds: number;
  incrementSeconds: number;
  tournamentId?: string;
}

export interface CreateGameResult {
  gameId: string;
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
}

/**
 * Create a game record in the database and register it with the GameManager.
 * Shared between normal matchmaking and tournament pairing.
 */
export function createGameRecord(params: CreateGameParams): CreateGameResult {
  const {
    whiteId,
    blackId,
    whiteElo,
    blackElo,
    timeControlSeconds,
    incrementSeconds,
    tournamentId,
  } = params;

  const gameId = uuidv4();
  const timeControlMs = timeControlSeconds * 1000;

  // Get player names
  const whiteMolty = db
    .select({ name: moltys.name })
    .from(moltys)
    .where(eq(moltys.id, whiteId))
    .get();
  const blackMolty = db
    .select({ name: moltys.name })
    .from(moltys)
    .where(eq(moltys.id, blackId))
    .get();

  // Create game record
  db.insert(games)
    .values({
      id: gameId,
      whiteId,
      blackId,
      tournamentId: tournamentId ?? null,
      status: "active",
      whiteEloStart: whiteElo,
      blackEloStart: blackElo,
      timeControlSeconds,
      incrementSeconds,
      whiteTimeRemaining: timeControlMs,
      blackTimeRemaining: timeControlMs,
      startedAt: new Date(),
    })
    .run();

  // Create the game in the engine
  const gm = getGameManager();
  gm.createGame(gameId, timeControlMs, incrementSeconds * 1000);

  return {
    gameId,
    whiteId,
    blackId,
    whiteName: whiteMolty?.name ?? "Unknown",
    blackName: blackMolty?.name ?? "Unknown",
  };
}

/**
 * Randomly assign colors and create a game between two players.
 */
export function createMatchWithRandomColors(
  entry1: { moltyId: string; elo: number },
  entry2: { moltyId: string; elo: number },
  timeControlSeconds: number,
  incrementSeconds: number,
  tournamentId?: string
): CreateGameResult {
  const whiteFirst = Math.random() < 0.5;
  const white = whiteFirst ? entry1 : entry2;
  const black = whiteFirst ? entry2 : entry1;

  return createGameRecord({
    whiteId: white.moltyId,
    blackId: black.moltyId,
    whiteElo: white.elo,
    blackElo: black.elo,
    timeControlSeconds,
    incrementSeconds,
    tournamentId,
  });
}
