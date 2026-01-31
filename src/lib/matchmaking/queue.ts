import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { matchmakingQueue, games, moltys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getQueueEntries } from "@/lib/db/queries";
import { getGameManager } from "@/lib/chess/engine";
import {
  MATCHMAKING_INTERVAL_MS,
  MATCHMAKING_ELO_WINDOWS,
  DEFAULT_TIME_CONTROL_SECONDS,
  DEFAULT_INCREMENT_SECONDS,
} from "@/lib/constants";

interface MatchResult {
  gameId: string;
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
}

function findMatch(
  entries: Array<{
    id: number;
    moltyId: string;
    elo: number;
    joinedAt: Date;
  }>
): [number, number] | null {
  const now = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const waitSeconds = (now - entry.joinedAt.getTime()) / 1000;

    // Determine the ELO range based on wait time
    let maxRange = 100;
    for (const window of MATCHMAKING_ELO_WINDOWS) {
      if (waitSeconds >= window.waitSeconds) {
        maxRange = window.range;
      }
    }

    // Find the best match within range
    let bestMatchIdx = -1;
    let bestEloDiff = Infinity;

    for (let j = i + 1; j < entries.length; j++) {
      const candidate = entries[j];
      const eloDiff = Math.abs(entry.elo - candidate.elo);

      if (eloDiff <= maxRange && eloDiff < bestEloDiff) {
        bestEloDiff = eloDiff;
        bestMatchIdx = j;
      }
    }

    // Also check if the candidate has been waiting long enough
    // to accept a wider range
    if (bestMatchIdx === -1) {
      for (let j = i + 1; j < entries.length; j++) {
        const candidate = entries[j];
        const candidateWait =
          (now - candidate.joinedAt.getTime()) / 1000;
        let candidateRange = 100;
        for (const window of MATCHMAKING_ELO_WINDOWS) {
          if (candidateWait >= window.waitSeconds) {
            candidateRange = window.range;
          }
        }

        const eloDiff = Math.abs(entry.elo - candidate.elo);
        if (eloDiff <= candidateRange && eloDiff < bestEloDiff) {
          bestEloDiff = eloDiff;
          bestMatchIdx = j;
        }
      }
    }

    if (bestMatchIdx !== -1) {
      return [i, bestMatchIdx];
    }
  }

  return null;
}

function createMatch(
  entry1: { moltyId: string; elo: number },
  entry2: { moltyId: string; elo: number }
): MatchResult {
  // Random color assignment
  const whiteFirst = Math.random() < 0.5;
  const white = whiteFirst ? entry1 : entry2;
  const black = whiteFirst ? entry2 : entry1;

  const gameId = uuidv4();
  const timeControlMs = DEFAULT_TIME_CONTROL_SECONDS * 1000;

  // Get player names
  const whiteMolty = db
    .select({ name: moltys.name })
    .from(moltys)
    .where(eq(moltys.id, white.moltyId))
    .get();
  const blackMolty = db
    .select({ name: moltys.name })
    .from(moltys)
    .where(eq(moltys.id, black.moltyId))
    .get();

  // Create game record
  db.insert(games)
    .values({
      id: gameId,
      whiteId: white.moltyId,
      blackId: black.moltyId,
      status: "active",
      whiteEloStart: white.elo,
      blackEloStart: black.elo,
      timeControlSeconds: DEFAULT_TIME_CONTROL_SECONDS,
      incrementSeconds: DEFAULT_INCREMENT_SECONDS,
      whiteTimeRemaining: timeControlMs,
      blackTimeRemaining: timeControlMs,
      startedAt: new Date(),
    })
    .run();

  // Remove both from queue
  db.delete(matchmakingQueue)
    .where(eq(matchmakingQueue.moltyId, white.moltyId))
    .run();
  db.delete(matchmakingQueue)
    .where(eq(matchmakingQueue.moltyId, black.moltyId))
    .run();

  // Create the game in the engine
  const gm = getGameManager();
  gm.createGame(gameId, timeControlMs, DEFAULT_INCREMENT_SECONDS * 1000);

  return {
    gameId,
    whiteId: white.moltyId,
    blackId: black.moltyId,
    whiteName: whiteMolty?.name ?? "Unknown",
    blackName: blackMolty?.name ?? "Unknown",
  };
}

export function runMatchmaking(): MatchResult[] {
  const entries = getQueueEntries();
  if (entries.length < 2) return [];

  const matches: MatchResult[] = [];
  const remaining = [...entries];

  while (remaining.length >= 2) {
    const pair = findMatch(remaining);
    if (!pair) break;

    const [i, j] = pair;
    const match = createMatch(remaining[i], remaining[j]);
    matches.push(match);

    // Remove matched entries (higher index first to avoid shifting)
    remaining.splice(j, 1);
    remaining.splice(i, 1);
  }

  return matches;
}

let matchmakingInterval: ReturnType<typeof setInterval> | null = null;

export function startMatchmakingLoop(
  onMatch?: (match: MatchResult) => void
): void {
  if (matchmakingInterval) return;

  console.log(
    `Matchmaking loop started (every ${MATCHMAKING_INTERVAL_MS / 1000}s)`
  );

  matchmakingInterval = setInterval(() => {
    try {
      const matches = runMatchmaking();
      for (const match of matches) {
        console.log(
          `Match created: ${match.whiteName} (white) vs ${match.blackName} (black) — Game ${match.gameId}`
        );
        if (onMatch) onMatch(match);
      }
    } catch (err) {
      console.error("Matchmaking error:", err);
    }
  }, MATCHMAKING_INTERVAL_MS);
}

export function stopMatchmakingLoop(): void {
  if (matchmakingInterval) {
    clearInterval(matchmakingInterval);
    matchmakingInterval = null;
  }
}
