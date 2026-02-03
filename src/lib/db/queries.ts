import { db } from "./index";
import { moltys, games, moves, matchmakingQueue, tournaments, tournamentParticipants } from "./schema";
import { eq, desc, and, or, sql, asc, ne } from "drizzle-orm";

// ---- Molty queries ----

export function getMoltyById(id: string) {
  return db.select().from(moltys).where(eq(moltys.id, id)).get();
}

export function getMoltyByName(name: string) {
  return db.select().from(moltys).where(eq(moltys.name, name)).get();
}

// ---- Game queries ----

export function getGameById(id: string) {
  return db.select().from(games).where(eq(games.id, id)).get();
}

export function getActiveGameForMolty(moltyId: string) {
  return db
    .select()
    .from(games)
    .where(
      and(
        eq(games.status, "active"),
        or(eq(games.whiteId, moltyId), eq(games.blackId, moltyId))
      )
    )
    .get();
}

export function getGameHistory(
  moltyId: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  return db
    .select()
    .from(games)
    .where(
      and(
        eq(games.status, "completed"),
        or(eq(games.whiteId, moltyId), eq(games.blackId, moltyId))
      )
    )
    .orderBy(desc(games.completedAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getActiveGames() {
  return db
    .select()
    .from(games)
    .where(eq(games.status, "active"))
    .all();
}

// ---- Move queries ----

export function getMovesForGame(gameId: string) {
  return db
    .select()
    .from(moves)
    .where(eq(moves.gameId, gameId))
    .orderBy(asc(moves.id))
    .all();
}

// ---- Matchmaking queries ----

export function getQueueEntries() {
  return db
    .select()
    .from(matchmakingQueue)
    .orderBy(asc(matchmakingQueue.joinedAt))
    .all();
}

export function getQueueEntryForMolty(moltyId: string) {
  return db
    .select()
    .from(matchmakingQueue)
    .where(eq(matchmakingQueue.moltyId, moltyId))
    .get();
}

export function getQueueCount() {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(matchmakingQueue)
    .get();
  return result?.count ?? 0;
}

// ---- Leaderboard ----

export function getLeaderboard(page: number, limit: number) {
  const offset = (page - 1) * limit;
  return db
    .select({
      id: moltys.id,
      name: moltys.name,
      elo: moltys.elo,
      gamesPlayed: moltys.gamesPlayed,
      wins: moltys.wins,
      losses: moltys.losses,
      draws: moltys.draws,
    })
    .from(moltys)
    .where(eq(moltys.isActive, true))
    .orderBy(desc(moltys.elo))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getTotalMoltys() {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(moltys)
    .where(eq(moltys.isActive, true))
    .get();
  return result?.count ?? 0;
}

export function getTotalGamesPlayed() {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(games)
    .where(eq(games.status, "completed"))
    .get();
  return result?.count ?? 0;
}

// ---- Tournament queries ----

export function getCurrentTournament() {
  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "active"))
    .get();
}

export function getTotalTournamentCount() {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(tournaments)
    .get();
  return result?.count ?? 0;
}

export function getNextScheduledTournament() {
  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "scheduled"))
    .orderBy(asc(tournaments.startsAt))
    .get();
}

export function getMostRecentCompletedTournament() {
  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "completed"))
    .orderBy(desc(tournaments.createdAt))
    .get();
}

export function getTournamentById(id: string) {
  return db.select().from(tournaments).where(eq(tournaments.id, id)).get();
}

export function getTournamentStandings(tournamentId: string) {
  return db
    .select({
      id: tournamentParticipants.id,
      moltyId: tournamentParticipants.moltyId,
      name: moltys.name,
      score: tournamentParticipants.score,
      gamesPlayed: tournamentParticipants.gamesPlayed,
      wins: tournamentParticipants.wins,
      losses: tournamentParticipants.losses,
      draws: tournamentParticipants.draws,
      rank: tournamentParticipants.rank,
      elo: moltys.elo,
    })
    .from(tournamentParticipants)
    .innerJoin(moltys, eq(tournamentParticipants.moltyId, moltys.id))
    .where(eq(tournamentParticipants.tournamentId, tournamentId))
    .orderBy(
      desc(tournamentParticipants.score),
      desc(tournamentParticipants.gamesPlayed)
    )
    .all();
}

export function getParticipantEntry(tournamentId: string, moltyId: string) {
  return db
    .select()
    .from(tournamentParticipants)
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.moltyId, moltyId)
      )
    )
    .get();
}

export function getTournamentGames(
  tournamentId: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  return db
    .select()
    .from(games)
    .where(eq(games.tournamentId, tournamentId))
    .orderBy(desc(games.createdAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getPastTournaments(page: number, limit: number) {
  const offset = (page - 1) * limit;
  return db
    .select()
    .from(tournaments)
    .where(eq(tournaments.status, "completed"))
    .orderBy(desc(tournaments.startsAt))
    .limit(limit)
    .offset(offset)
    .all();
}

export function getTournamentGameCount(tournamentId: string) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(games)
    .where(eq(games.tournamentId, tournamentId))
    .get();
  return result?.count ?? 0;
}
