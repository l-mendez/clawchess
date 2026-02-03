import { db } from "@/lib/db";
import { matchmakingQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getQueueEntries } from "@/lib/db/queries";
import {
  MATCHMAKING_INTERVAL_MS,
  MATCHMAKING_ELO_WINDOWS,
  DEFAULT_TIME_CONTROL_SECONDS,
  DEFAULT_INCREMENT_SECONDS,
  BOT_FALLBACK_WAIT_SECONDS,
} from "@/lib/constants";
import { getAvailableFakeUser } from "@/lib/simulator/fake-users";
import { startBotSession } from "@/lib/simulator/bot-player";
import { createMatchWithRandomColors, type CreateGameResult } from "@/lib/chess/game-factory";

type MatchResult = CreateGameResult;

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
  const match = createMatchWithRandomColors(
    entry1,
    entry2,
    DEFAULT_TIME_CONTROL_SECONDS,
    DEFAULT_INCREMENT_SECONDS
  );

  // Remove both from queue
  db.delete(matchmakingQueue)
    .where(eq(matchmakingQueue.moltyId, entry1.moltyId))
    .run();
  db.delete(matchmakingQueue)
    .where(eq(matchmakingQueue.moltyId, entry2.moltyId))
    .run();

  return match;
}

function isBot(moltyId: string): boolean {
  return moltyId.startsWith("bot-");
}

export function runMatchmaking(): MatchResult[] {
  const entries = getQueueEntries();
  const realEntries = entries.filter((e) => !isBot(e.moltyId));

  const matches: MatchResult[] = [];

  // Phase 1: Match real users with each other
  if (realEntries.length >= 2) {
    const remaining = [...realEntries];

    while (remaining.length >= 2) {
      const pair = findMatch(remaining);
      if (!pair) break;

      const [i, j] = pair;
      const match = createMatch(remaining[i], remaining[j]);
      matches.push(match);

      remaining.splice(j, 1);
      remaining.splice(i, 1);
    }
  }

  // Phase 2: Bot fallback for a single lonely real user
  const remainingEntries = getQueueEntries().filter((e) => !isBot(e.moltyId));

  if (remainingEntries.length === 1) {
    const lonelyUser = remainingEntries[0];
    const waitSeconds = (Date.now() - lonelyUser.joinedAt.getTime()) / 1000;

    if (waitSeconds >= BOT_FALLBACK_WAIT_SECONDS) {
      const bot = getAvailableFakeUser(lonelyUser.elo);
      if (bot) {
        const match = createMatch(
          { moltyId: lonelyUser.moltyId, elo: lonelyUser.elo },
          { moltyId: bot.id, elo: bot.elo }
        );
        matches.push(match);

        const botColor: "w" | "b" = match.whiteId === bot.id ? "w" : "b";
        startBotSession(match.gameId, bot.id, botColor);

        console.log(
          `[Matchmaking] Bot fallback: matched with ${bot.name} after ${Math.round(waitSeconds)}s wait`
        );
      }
    }
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
