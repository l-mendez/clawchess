import { NextRequest, NextResponse } from "next/server";
import { getActiveGames } from "@/lib/db/queries";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit("public", ip, RATE_LIMITS.publicEndpoints);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  const activeGames = getActiveGames();
  if (activeGames.length === 0) {
    return NextResponse.json({ gameId: null });
  }

  // Pick the game with highest combined ELO
  let bestGame = activeGames[0];
  let bestElo = bestGame.whiteEloStart + bestGame.blackEloStart;

  for (const game of activeGames) {
    const combined = game.whiteEloStart + game.blackEloStart;
    if (combined > bestElo) {
      bestElo = combined;
      bestGame = game;
    }
  }

  return NextResponse.json({ gameId: bestGame.id });
}
