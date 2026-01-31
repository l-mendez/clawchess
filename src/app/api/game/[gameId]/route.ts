import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { getGameById, getMovesForGame } from "@/lib/db/queries";
import { getMoltyById } from "@/lib/db/queries";
import { getGameManager } from "@/lib/chess/engine";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function GET(
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

  // Check the requesting Molty is a participant
  const isParticipant =
    gameRecord.whiteId === molty.id || gameRecord.blackId === molty.id;

  if (!isParticipant && gameRecord.status !== "completed") {
    return NextResponse.json(
      { error: "You are not a participant in this game" },
      { status: 403 }
    );
  }

  const white = getMoltyById(gameRecord.whiteId);
  const black = getMoltyById(gameRecord.blackId);

  const gm = getGameManager();

  // If the game is active and in memory, use live state
  if (gm.isActive(gameId)) {
    const state = gm.getState(gameId);
    if (!state) {
      return NextResponse.json(
        { error: "Game state unavailable" },
        { status: 500 }
      );
    }

    const moltyColor =
      gameRecord.whiteId === molty.id ? "w" : "b";
    const isMyTurn = state.turn === moltyColor;

    return NextResponse.json({
      id: gameId,
      white: {
        id: gameRecord.whiteId,
        name: white?.name,
        elo: gameRecord.whiteEloStart,
      },
      black: {
        id: gameRecord.blackId,
        name: black?.name,
        elo: gameRecord.blackEloStart,
      },
      status: "active",
      fen: state.fen,
      pgn: state.pgn,
      turn: state.turn,
      move_count: state.moveCount,
      white_time_remaining_ms: state.whiteTimeMs,
      black_time_remaining_ms: state.blackTimeMs,
      is_check: state.isCheck,
      legal_moves: isMyTurn ? state.legalMoves : undefined,
      last_move: state.lastMove,
      result: null,
    });
  }

  // Game is completed — return from database
  const movesHistory = getMovesForGame(gameId);

  return NextResponse.json({
    id: gameId,
    white: {
      id: gameRecord.whiteId,
      name: white?.name,
      elo: gameRecord.whiteEloStart,
    },
    black: {
      id: gameRecord.blackId,
      name: black?.name,
      elo: gameRecord.blackEloStart,
    },
    status: gameRecord.status,
    fen: gameRecord.finalFen,
    pgn: gameRecord.pgn,
    turn: null,
    move_count: gameRecord.moveCount,
    white_time_remaining_ms: gameRecord.whiteTimeRemaining,
    black_time_remaining_ms: gameRecord.blackTimeRemaining,
    is_check: false,
    legal_moves: undefined,
    last_move:
      movesHistory.length > 0
        ? { san: movesHistory[movesHistory.length - 1].san }
        : null,
    result: gameRecord.result,
    result_reason: gameRecord.resultReason,
    white_elo_change: gameRecord.whiteEloEnd
      ? Math.round(
          (gameRecord.whiteEloEnd - gameRecord.whiteEloStart) * 10
        ) / 10
      : null,
    black_elo_change: gameRecord.blackEloEnd
      ? Math.round(
          (gameRecord.blackEloEnd - gameRecord.blackEloStart) * 10
        ) / 10
      : null,
  });
}
