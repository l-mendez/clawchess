import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { getGameById } from "@/lib/db/queries";
import { getGameManager } from "@/lib/chess/engine";
import { moveSchema } from "@/lib/validation/schemas";
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

  // Rate limit moves more strictly
  const rateCheck = checkRateLimit(
    "move",
    molty.id,
    RATE_LIMITS.moveEndpoint
  );
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
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

  // Determine this Molty's color
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
  const result = gm.makeMove(gameId, parsed.data.move, moltyColor);

  if (!result.success) {
    const status = result.error === "It is not your turn." ? 409 : 400;
    return NextResponse.json(
      {
        error: result.error,
        legal_moves: result.legalMoves,
      },
      { status }
    );
  }

  const response: Record<string, unknown> = {
    success: true,
    move: { san: result.san, from: result.from, to: result.to },
    fen: result.fen,
    turn: result.turn,
    is_check: result.isCheck,
    is_game_over: result.isGameOver,
    time_remaining_ms: result.timeRemainingMs,
  };

  if (result.gameOverInfo) {
    response.game_result = result.gameOverInfo;
  }

  return NextResponse.json(response);
}
