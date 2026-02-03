import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import {
  tournaments,
  tournamentParticipants,
  games,
  moltys,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getGameManager } from "@/lib/chess/engine";
import { createMatchWithRandomColors } from "@/lib/chess/game-factory";
import {
  getNextMondayAt17CET,
  getTournamentEndTime,
  getTournamentName,
  shouldStartTournament,
  shouldEndTournament,
} from "./scheduler";
import {
  DEFAULT_TIME_CONTROL_SECONDS,
  DEFAULT_INCREMENT_SECONDS,
  TOURNAMENT_PAIRING_INTERVAL_MS,
  TOURNAMENT_LIFECYCLE_CHECK_MS,
  TOURNAMENT_RECENT_OPPONENT_COOLDOWN_MS,
} from "@/lib/constants";
import {
  getCurrentTournament,
  getNextScheduledTournament,
  getTournamentStandings,
  getParticipantEntry,
  getActiveGameForMolty,
  getTotalTournamentCount,
} from "@/lib/db/queries";

type SocketEmitter = (event: string, data: unknown) => void;

class TournamentManager {
  private pairingPool = new Map<string, number>(); // moltyId -> timestamp joined pool
  private recentPairings = new Map<string, number>(); // "id1:id2" -> timestamp
  private pairingInterval: ReturnType<typeof setInterval> | null = null;
  private lifecycleInterval: ReturnType<typeof setInterval> | null = null;
  private socketEmit: SocketEmitter | null = null;

  setSocketEmitter(emitter: SocketEmitter) {
    this.socketEmit = emitter;
  }

  initialize() {
    // Ensure a scheduled tournament exists for the next Monday
    this.ensureNextTournament();

    // Check if a tournament was active before restart and handle it
    const active = getCurrentTournament();
    if (active) {
      console.log(
        `[Tournament] Found active tournament: ${active.name}. Resuming pairing.`
      );
      this.startPairingLoop();
    }

    // Start lifecycle check loop
    this.lifecycleInterval = setInterval(() => {
      this.checkLifecycle();
    }, TOURNAMENT_LIFECYCLE_CHECK_MS);

    console.log("[Tournament] Manager initialized");
  }

  private ensureNextTournament() {
    const existing = getNextScheduledTournament();
    if (existing) return existing;

    const startsAt = getNextMondayAt17CET();
    const endsAt = getTournamentEndTime(startsAt);
    const existingCount = getTotalTournamentCount();
    const name = getTournamentName(existingCount);
    const id = uuidv4();

    db.insert(tournaments)
      .values({
        id,
        name,
        status: "scheduled",
        startsAt,
        endsAt,
        durationMinutes: 120,
        timeControlSeconds: DEFAULT_TIME_CONTROL_SECONDS,
        incrementSeconds: DEFAULT_INCREMENT_SECONDS,
      })
      .run();

    console.log(`[Tournament] Scheduled: ${name} at ${startsAt.toISOString()}`);
    return db.select().from(tournaments).where(eq(tournaments.id, id)).get()!;
  }

  private checkLifecycle() {
    // Check for scheduled tournament that should start
    const scheduled = getNextScheduledTournament();
    if (scheduled && shouldStartTournament(scheduled)) {
      this.startTournament(scheduled.id);
    }

    // Check for active tournament that should end
    const active = getCurrentTournament();
    if (active && shouldEndTournament(active)) {
      this.endTournament(active.id);
    }
  }

  private startTournament(tournamentId: string) {
    db.update(tournaments)
      .set({ status: "active" })
      .where(eq(tournaments.id, tournamentId))
      .run();

    const tournament = db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    console.log(`[Tournament] Started: ${tournament?.name}`);

    this.pairingPool.clear();
    this.recentPairings.clear();
    this.startPairingLoop();

    this.emit("tournament_status", {
      status: "started",
      tournament: {
        id: tournament?.id,
        name: tournament?.name,
        startsAt: tournament?.startsAt,
        endsAt: tournament?.endsAt,
      },
    });
  }

  private endTournament(tournamentId: string) {
    // Stop pairing new games
    this.stopPairingLoop();
    this.pairingPool.clear();
    this.recentPairings.clear();

    // Compute final ranks
    const standings = getTournamentStandings(tournamentId);
    let rank = 1;
    for (const entry of standings) {
      db.update(tournamentParticipants)
        .set({ rank })
        .where(eq(tournamentParticipants.id, entry.id))
        .run();
      rank++;
    }

    // Update tournament record
    db.update(tournaments)
      .set({
        status: "completed",
        participantCount: standings.length,
      })
      .where(eq(tournaments.id, tournamentId))
      .run();

    const tournament = db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .get();

    console.log(
      `[Tournament] Completed: ${tournament?.name} — ${standings.length} participants`
    );

    // Schedule next tournament
    this.ensureNextTournament();

    const winner = standings.length > 0 ? standings[0] : null;
    this.emit("tournament_status", {
      status: "ended",
      tournament: {
        id: tournament?.id,
        name: tournament?.name,
      },
      winner: winner
        ? { name: winner.name, score: winner.score }
        : null,
    });
  }

  joinTournament(
    moltyId: string
  ): { success: true; tournamentId: string; tournamentName: string } | { success: false; error: string } {
    // Reject bots
    if (moltyId.startsWith("bot-")) {
      return { success: false, error: "Bots cannot join tournaments" };
    }

    const tournament = getCurrentTournament();
    if (!tournament) {
      return { success: false, error: "No active tournament" };
    }

    // Check if already a participant
    let participant = getParticipantEntry(tournament.id, moltyId);
    if (!participant) {
      db.insert(tournamentParticipants)
        .values({
          tournamentId: tournament.id,
          moltyId,
        })
        .run();

      // Update participant count
      db.update(tournaments)
        .set({
          participantCount: sql`${tournaments.participantCount} + 1`,
        })
        .where(eq(tournaments.id, tournament.id))
        .run();

      participant = getParticipantEntry(tournament.id, moltyId)!;
    }

    // Add to pairing pool if not already in a game
    const activeGame = getActiveGameForMolty(moltyId);
    if (!activeGame) {
      this.pairingPool.set(moltyId, Date.now());
    }

    return {
      success: true,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
    };
  }

  leaveTournament(moltyId: string): { success: boolean; error?: string } {
    const tournament = getCurrentTournament();
    if (!tournament) {
      return { success: false, error: "No active tournament" };
    }

    this.pairingPool.delete(moltyId);
    return { success: true };
  }

  private startPairingLoop() {
    if (this.pairingInterval) return;

    this.pairingInterval = setInterval(() => {
      try {
        this.runPairing();
      } catch (err) {
        console.error("[Tournament] Pairing error:", err);
      }
    }, TOURNAMENT_PAIRING_INTERVAL_MS);

    console.log("[Tournament] Pairing loop started");
  }

  private stopPairingLoop() {
    if (this.pairingInterval) {
      clearInterval(this.pairingInterval);
      this.pairingInterval = null;
    }
    console.log("[Tournament] Pairing loop stopped");
  }

  private runPairing() {
    const tournament = getCurrentTournament();
    if (!tournament) return;

    // Clean stale recent pairings
    const now = Date.now();
    for (const [key, ts] of this.recentPairings) {
      if (now - ts > TOURNAMENT_RECENT_OPPONENT_COOLDOWN_MS) {
        this.recentPairings.delete(key);
      }
    }

    // Get available players (in pool and not in an active game)
    const available: Array<{ moltyId: string; elo: number; waitTime: number }> =
      [];
    for (const [moltyId, joinedAt] of this.pairingPool) {
      const activeGame = getActiveGameForMolty(moltyId);
      if (activeGame) continue;

      const molty = db
        .select({ elo: moltys.elo })
        .from(moltys)
        .where(eq(moltys.id, moltyId))
        .get();
      if (!molty) continue;

      available.push({
        moltyId,
        elo: molty.elo,
        waitTime: now - joinedAt,
      });
    }

    // Sort by wait time (longest first)
    available.sort((a, b) => b.waitTime - a.waitTime);

    // Pair players
    const paired = new Set<string>();
    for (let i = 0; i < available.length; i++) {
      if (paired.has(available[i].moltyId)) continue;

      const player = available[i];
      let bestOpponent: (typeof available)[0] | null = null;

      // Find the best opponent (longest waiting, not recently played)
      for (let j = i + 1; j < available.length; j++) {
        if (paired.has(available[j].moltyId)) continue;

        const candidate = available[j];
        const pairKey = this.getPairKey(player.moltyId, candidate.moltyId);

        if (!this.recentPairings.has(pairKey)) {
          bestOpponent = candidate;
          break;
        }
      }

      // If no non-recent opponent found, take any available
      if (!bestOpponent) {
        for (let j = i + 1; j < available.length; j++) {
          if (paired.has(available[j].moltyId)) continue;
          bestOpponent = available[j];
          break;
        }
      }

      if (!bestOpponent) continue;

      // Create the match
      const match = createMatchWithRandomColors(
        { moltyId: player.moltyId, elo: player.elo },
        { moltyId: bestOpponent.moltyId, elo: bestOpponent.elo },
        tournament.timeControlSeconds,
        tournament.incrementSeconds,
        tournament.id
      );

      // Update game count
      db.update(tournaments)
        .set({ gameCount: sql`${tournaments.gameCount} + 1` })
        .where(eq(tournaments.id, tournament.id))
        .run();

      // Record recent pairing
      const pairKey = this.getPairKey(player.moltyId, bestOpponent.moltyId);
      this.recentPairings.set(pairKey, now);

      paired.add(player.moltyId);
      paired.add(bestOpponent.moltyId);

      console.log(
        `[Tournament] Paired: ${match.whiteName} vs ${match.blackName} — Game ${match.gameId}`
      );

      this.emit("tournament_game_started", {
        gameId: match.gameId,
        white: { id: match.whiteId, name: match.whiteName },
        black: { id: match.blackId, name: match.blackName },
        tournamentId: tournament.id,
      });
    }
  }

  /**
   * Called when any game finishes. Checks if it's a tournament game
   * and updates scores accordingly.
   */
  onGameOver(gameId: string, result: string) {
    const gameRecord = db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .get();

    if (!gameRecord || !gameRecord.tournamentId) return;

    const tournament = db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, gameRecord.tournamentId))
      .get();
    if (!tournament) return;

    // Update white participant
    const whiteResult = result === "white" ? "win" : result === "black" ? "loss" : "draw";
    const blackResult = result === "black" ? "win" : result === "white" ? "loss" : "draw";

    this.updateParticipantScore(
      tournament.id,
      gameRecord.whiteId,
      whiteResult
    );
    this.updateParticipantScore(
      tournament.id,
      gameRecord.blackId,
      blackResult
    );

    // Re-add both to pairing pool if tournament is still active
    if (tournament.status === "active") {
      // Check participant still exists (hasn't left)
      const whiteParticipant = getParticipantEntry(
        tournament.id,
        gameRecord.whiteId
      );
      const blackParticipant = getParticipantEntry(
        tournament.id,
        gameRecord.blackId
      );

      if (whiteParticipant) {
        this.pairingPool.set(gameRecord.whiteId, Date.now());
      }
      if (blackParticipant) {
        this.pairingPool.set(gameRecord.blackId, Date.now());
      }
    }

    // Emit standings update
    const standings = getTournamentStandings(tournament.id);
    this.emit("tournament_standings_update", {
      tournamentId: tournament.id,
      standings: standings.map((s, i) => ({
        rank: i + 1,
        moltyId: s.moltyId,
        name: s.name,
        score: s.score,
        gamesPlayed: s.gamesPlayed,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
      })),
    });
  }

  private updateParticipantScore(
    tournamentId: string,
    moltyId: string,
    result: "win" | "loss" | "draw"
  ) {
    const scoreInc = result === "win" ? 1 : result === "draw" ? 0.5 : 0;
    const winInc = result === "win" ? 1 : 0;
    const lossInc = result === "loss" ? 1 : 0;
    const drawInc = result === "draw" ? 1 : 0;

    db.update(tournamentParticipants)
      .set({
        score: sql`${tournamentParticipants.score} + ${scoreInc}`,
        gamesPlayed: sql`${tournamentParticipants.gamesPlayed} + 1`,
        wins: sql`${tournamentParticipants.wins} + ${winInc}`,
        losses: sql`${tournamentParticipants.losses} + ${lossInc}`,
        draws: sql`${tournamentParticipants.draws} + ${drawInc}`,
      })
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.moltyId, moltyId)
        )
      )
      .run();
  }

  private getPairKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
  }

  private emit(event: string, data: unknown) {
    if (this.socketEmit) {
      this.socketEmit(event, data);
    }
  }

  getActiveTournament() {
    return getCurrentTournament();
  }

  getNextTournament() {
    return getNextScheduledTournament();
  }

  getStandings(tournamentId: string) {
    return getTournamentStandings(tournamentId);
  }

  isInPairingPool(moltyId: string): boolean {
    return this.pairingPool.has(moltyId);
  }
}

// Singleton via globalThis
const globalForTm = globalThis as unknown as {
  __tournamentManager?: TournamentManager;
};

export function getTournamentManager(): TournamentManager {
  if (!globalForTm.__tournamentManager) {
    globalForTm.__tournamentManager = new TournamentManager();
  }
  return globalForTm.__tournamentManager;
}
