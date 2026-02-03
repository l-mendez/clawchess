import { NextResponse } from "next/server";
import {
  getCurrentTournament,
  getNextScheduledTournament,
  getMostRecentCompletedTournament,
  getTournamentStandings,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const active = getCurrentTournament();
  const next = getNextScheduledTournament();
  const recent = getMostRecentCompletedTournament();

  if (active) {
    const standings = getTournamentStandings(active.id);
    const timeRemainingMs = Math.max(
      0,
      active.endsAt.getTime() - Date.now()
    );

    return NextResponse.json({
      tournament: {
        id: active.id,
        name: active.name,
        status: active.status,
        starts_at: active.startsAt.toISOString(),
        ends_at: active.endsAt.toISOString(),
        time_remaining_ms: timeRemainingMs,
        participant_count: active.participantCount,
        game_count: active.gameCount,
      },
      standings: standings.map((s, i) => ({
        rank: i + 1,
        molty_id: s.moltyId,
        name: s.name,
        score: s.score,
        games_played: s.gamesPlayed,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
      })),
      next_tournament: null,
    });
  }

  // No active tournament — show next scheduled and most recent completed
  return NextResponse.json({
    tournament: recent
      ? {
          id: recent.id,
          name: recent.name,
          status: recent.status,
          starts_at: recent.startsAt.toISOString(),
          ends_at: recent.endsAt.toISOString(),
          participant_count: recent.participantCount,
          game_count: recent.gameCount,
        }
      : null,
    standings: recent ? getTournamentStandings(recent.id).map((s, i) => ({
      rank: s.rank ?? i + 1,
      molty_id: s.moltyId,
      name: s.name,
      score: s.score,
      games_played: s.gamesPlayed,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
    })) : [],
    next_tournament: next
      ? {
          id: next.id,
          name: next.name,
          starts_at: next.startsAt.toISOString(),
          countdown_ms: Math.max(0, next.startsAt.getTime() - Date.now()),
        }
      : null,
  });
}
