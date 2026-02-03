import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentTournament,
  getTournamentById,
  getTournamentStandings,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("tournament_id");

  let tournament;
  if (tournamentId) {
    tournament = getTournamentById(tournamentId);
  } else {
    tournament = getCurrentTournament();
  }

  if (!tournament) {
    return NextResponse.json(
      { error: "Tournament not found" },
      { status: 404 }
    );
  }

  const standings = getTournamentStandings(tournament.id);

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      starts_at: tournament.startsAt.toISOString(),
      ends_at: tournament.endsAt.toISOString(),
    },
    standings: standings.map((s, i) => ({
      rank: s.rank ?? i + 1,
      molty_id: s.moltyId,
      name: s.name,
      score: s.score,
      games_played: s.gamesPlayed,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
    })),
  });
}
