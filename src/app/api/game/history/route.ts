import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { getGameHistory, getMoltyById } from "@/lib/db/queries";
import { paginationSchema } from "@/lib/validation/schemas";
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

  const { searchParams } = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "20",
  });

  const page = parsed.success ? parsed.data.page : 1;
  const limit = parsed.success ? parsed.data.limit : 20;

  const gameRecords = getGameHistory(molty.id, page, limit);

  const history = gameRecords.map((game) => {
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
      color: isWhite ? "white" : "black",
      result: resultForMolty,
      result_reason: game.resultReason,
      elo_change: eloChange,
      move_count: game.moveCount,
      completed_at: game.completedAt,
    };
  });

  return NextResponse.json({
    games: history,
    page,
  });
}
