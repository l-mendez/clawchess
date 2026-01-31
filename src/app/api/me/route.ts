import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { getActiveGameForMolty, getQueueEntryForMolty } from "@/lib/db/queries";
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

  // Rate limit by API key (molty id)
  const rateCheck = checkRateLimit("api", molty.id, RATE_LIMITS.apiGeneral);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  const activeGame = getActiveGameForMolty(molty.id);
  const inQueue = getQueueEntryForMolty(molty.id);

  return NextResponse.json({
    id: molty.id,
    name: molty.name,
    elo: molty.elo,
    games_played: molty.gamesPlayed,
    wins: molty.wins,
    losses: molty.losses,
    draws: molty.draws,
    current_game: activeGame?.id ?? null,
    in_queue: !!inQueue,
  });
}
