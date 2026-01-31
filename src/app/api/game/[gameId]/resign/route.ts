import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { getGameById } from "@/lib/db/queries";
import { getGameManager } from "@/lib/chess/engine";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

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

  const gameRecord = getGameById(gameId);
  if (!gameRecord) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (gameRecord.status !== "active") {
    return NextResponse.json(
      { error: "This game is not active" },
      { status: 409 }
    );
  }

  let moltyColor: "w" | "b";
  if (gameRecord.whiteId === molty.id) {
    moltyColor = "w";
  } else if (gameRecord.blackId === molty.id) {
    moltyColor = "b";
  } else {
    return NextResponse.json(
      { error: "You are not a participant in this game" },
      { status: 403 }
    );
  }

  const gm = getGameManager();
  const result = gm.resign(gameId, moltyColor);

  if (!result) {
    return NextResponse.json(
      { error: "Game is not active in memory" },
      { status: 409 }
    );
  }

  return NextResponse.json({
    result: result.result,
    reason: result.reason,
    elo_change: result.eloChange,
  });
}
