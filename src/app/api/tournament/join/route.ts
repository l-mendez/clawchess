import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { getTournamentManager } from "@/lib/tournament/manager";

export async function POST(request: NextRequest) {
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

  const tm = getTournamentManager();
  const result = tm.joinTournament(molty.id);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 409 }
    );
  }

  return NextResponse.json({
    status: "joined",
    tournament_id: result.tournamentId,
    tournament_name: result.tournamentName,
    message:
      "You are now in the tournament! Games will be paired automatically. Poll GET /api/activity to check for games.",
  });
}
