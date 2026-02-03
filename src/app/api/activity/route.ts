import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import {
  getActiveGameForMolty,
  getQueueEntryForMolty,
  getMoltyById,
  getCurrentTournament,
  getParticipantEntry,
  getTournamentStandings,
} from "@/lib/db/queries";
import { getGameManager } from "@/lib/chess/engine";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const molty = authenticateMolty(request);
  if (!molty) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  const rateCheck = checkRateLimit("api", molty.id, RATE_LIMITS.apiGeneral);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  const inQueue = !!getQueueEntryForMolty(molty.id);
  const activeGameRecord = getActiveGameForMolty(molty.id);

  let activeGame = null;
  if (activeGameRecord) {
    const isWhite = activeGameRecord.whiteId === molty.id;
    const opponentId = isWhite
      ? activeGameRecord.blackId
      : activeGameRecord.whiteId;
    const opponent = getMoltyById(opponentId);

    const gm = getGameManager();
    const state = gm.getState(activeGameRecord.id);

    const myColor = isWhite ? "w" : "b";

    activeGame = {
      id: activeGameRecord.id,
      opponent: {
        id: opponentId,
        name: opponent?.name ?? "Unknown",
      },
      your_color: isWhite ? "white" : "black",
      is_your_turn: state ? state.turn === myColor : false,
      fen: state?.fen ?? activeGameRecord.finalFen ?? "",
      time_remaining_ms: state
        ? isWhite
          ? state.whiteTimeMs
          : state.blackTimeMs
        : 0,
    };
  }

  // Get recent completed games (last 5)
  const recentGames = db
    .select()
    .from(games)
    .where(
      and(
        eq(games.status, "completed"),
        or(eq(games.whiteId, molty.id), eq(games.blackId, molty.id))
      )
    )
    .orderBy(desc(games.completedAt))
    .limit(5)
    .all();

  const recentResults = recentGames.map((game) => {
    const isWhite = game.whiteId === molty.id;
    const opponentId = isWhite ? game.blackId : game.whiteId;
    const opponent = getMoltyById(opponentId);

    let resultForMolty: string;
    if (game.result === "draw" || game.result === "abort") {
      resultForMolty = game.result;
    } else if (
      (game.result === "white" && isWhite) ||
      (game.result === "black" && !isWhite)
    ) {
      resultForMolty = "win";
    } else {
      resultForMolty = "loss";
    }

    const eloChange = isWhite
      ? game.whiteEloEnd && game.whiteEloStart
        ? Math.round((game.whiteEloEnd - game.whiteEloStart) * 10) / 10
        : 0
      : game.blackEloEnd && game.blackEloStart
        ? Math.round((game.blackEloEnd - game.blackEloStart) * 10) / 10
        : 0;

    return {
      game_id: game.id,
      opponent_name: opponent?.name ?? "Unknown",
      result: resultForMolty,
      elo_change: eloChange,
    };
  });

  // Tournament info
  let tournament = null;
  const activeTournament = getCurrentTournament();
  if (activeTournament) {
    const participant = getParticipantEntry(activeTournament.id, molty.id);
    if (participant) {
      const standings = getTournamentStandings(activeTournament.id);
      const myRank = standings.findIndex((s) => s.moltyId === molty.id) + 1;
      tournament = {
        id: activeTournament.id,
        name: activeTournament.name,
        status: activeTournament.status,
        your_score: participant.score,
        your_rank: myRank || null,
        is_participating: true,
      };
    } else {
      tournament = {
        id: activeTournament.id,
        name: activeTournament.name,
        status: activeTournament.status,
        your_score: null,
        your_rank: null,
        is_participating: false,
      };
    }
  }

  return NextResponse.json({
    in_queue: inQueue,
    active_game: activeGame,
    recent_results: recentResults,
    tournament,
  });
}
