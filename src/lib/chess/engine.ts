import { Chess } from "chess.js";
import { db } from "@/lib/db";
import { games, moves, moltys } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { calculateNewRatings } from "./elo";

export interface ActiveGame {
  chess: Chess;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
  incrementMs: number;
}

export interface MoveResult {
  success: true;
  san: string;
  from: string;
  to: string;
  fen: string;
  turn: "w" | "b";
  isCheck: boolean;
  isGameOver: boolean;
  timeRemainingMs: number;
  gameOverInfo?: {
    result: "white" | "black" | "draw";
    reason: string;
    whiteEloChange: number;
    blackEloChange: number;
  };
}

export interface GameState {
  id: string;
  fen: string;
  pgn: string;
  turn: "w" | "b";
  moveCount: number;
  whiteTimeMs: number;
  blackTimeMs: number;
  isCheck: boolean;
  isGameOver: boolean;
  legalMoves: string[];
  lastMove: { san: string; from: string; to: string } | null;
}

class GameManager {
  private activeGames = new Map<string, ActiveGame>();
  private onGameOverCallbacks: Array<
    (
      gameId: string,
      result: string,
      reason: string,
      whiteEloChange: number,
      blackEloChange: number
    ) => void
  > = [];
  private onMoveMadeCallbacks: Array<
    (
      gameId: string,
      data: {
        san: string;
        from: string;
        to: string;
        fen: string;
        turn: string;
        whiteTimeMs: number;
        blackTimeMs: number;
        isCheck: boolean;
        moveNumber: number;
      }
    ) => void
  > = [];

  addOnGameOver(
    cb: (
      gameId: string,
      result: string,
      reason: string,
      whiteEloChange: number,
      blackEloChange: number
    ) => void
  ) {
    this.onGameOverCallbacks.push(cb);
  }

  addOnMoveMade(
    cb: (
      gameId: string,
      data: {
        san: string;
        from: string;
        to: string;
        fen: string;
        turn: string;
        whiteTimeMs: number;
        blackTimeMs: number;
        isCheck: boolean;
        moveNumber: number;
      }
    ) => void
  ) {
    this.onMoveMadeCallbacks.push(cb);
  }

  createGame(
    gameId: string,
    timeControlMs: number,
    incrementMs: number = 0
  ): void {
    const chess = new Chess();
    this.activeGames.set(gameId, {
      chess,
      whiteTimeMs: timeControlMs,
      blackTimeMs: timeControlMs,
      lastMoveTimestamp: Date.now(),
      timeoutTimer: null,
      incrementMs,
    });
    this.startTimeoutTimer(gameId);
  }

  getActiveGame(gameId: string): ActiveGame | undefined {
    return this.activeGames.get(gameId);
  }

  isActive(gameId: string): boolean {
    return this.activeGames.has(gameId);
  }

  getState(gameId: string): GameState | null {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    const history = game.chess.history({ verbose: true });
    const lastMove = history.length > 0 ? history[history.length - 1] : null;

    // Calculate live time for the active player
    const now = Date.now();
    const elapsed = now - game.lastMoveTimestamp;
    let whiteTimeMs = game.whiteTimeMs;
    let blackTimeMs = game.blackTimeMs;

    if (game.chess.turn() === "w") {
      whiteTimeMs = Math.max(0, whiteTimeMs - elapsed);
    } else {
      blackTimeMs = Math.max(0, blackTimeMs - elapsed);
    }

    return {
      id: gameId,
      fen: game.chess.fen(),
      pgn: game.chess.pgn(),
      turn: game.chess.turn() as "w" | "b",
      moveCount: game.chess.moveNumber(),
      whiteTimeMs,
      blackTimeMs,
      isCheck: game.chess.isCheck(),
      isGameOver: game.chess.isGameOver(),
      legalMoves: game.chess.moves(),
      lastMove: lastMove
        ? { san: lastMove.san, from: lastMove.from, to: lastMove.to }
        : null,
    };
  }

  makeMove(
    gameId: string,
    move: string,
    moltyColor: "w" | "b"
  ): MoveResult | { success: false; error: string; legalMoves?: string[] } {
    const game = this.activeGames.get(gameId);
    if (!game) {
      return { success: false, error: "Game not found or not active" };
    }

    // Check it's the right player's turn
    if (game.chess.turn() !== moltyColor) {
      return { success: false, error: "It is not your turn." };
    }

    // Calculate time elapsed and deduct from the moving player
    const now = Date.now();
    const elapsed = now - game.lastMoveTimestamp;

    if (moltyColor === "w") {
      game.whiteTimeMs -= elapsed;
      if (game.whiteTimeMs <= 0) {
        game.whiteTimeMs = 0;
        this.handleTimeout(gameId);
        return { success: false, error: "You have run out of time." };
      }
    } else {
      game.blackTimeMs -= elapsed;
      if (game.blackTimeMs <= 0) {
        game.blackTimeMs = 0;
        this.handleTimeout(gameId);
        return { success: false, error: "You have run out of time." };
      }
    }

    // Attempt the move
    let result;
    try {
      result = game.chess.move(move);
    } catch {
      // chess.js throws on invalid moves
    }

    if (!result) {
      return {
        success: false,
        error: "Illegal move",
        legalMoves: game.chess.moves(),
      };
    }

    // Add increment after successful move
    if (game.incrementMs > 0) {
      if (moltyColor === "w") {
        game.whiteTimeMs += game.incrementMs;
      } else {
        game.blackTimeMs += game.incrementMs;
      }
    }

    game.lastMoveTimestamp = now;

    // Store move in database
    const moveNumber = game.chess.moveNumber();
    db.insert(moves)
      .values({
        gameId,
        moveNumber: moltyColor === "w" ? moveNumber - 1 : moveNumber - 1,
        color: moltyColor,
        san: result.san,
        fen: game.chess.fen(),
        timeRemainingMs:
          moltyColor === "w" ? game.whiteTimeMs : game.blackTimeMs,
      })
      .run();

    // Update game record
    db.update(games)
      .set({
        pgn: game.chess.pgn(),
        moveCount: game.chess.history().length,
        whiteTimeRemaining: game.whiteTimeMs,
        blackTimeRemaining: game.blackTimeMs,
      })
      .where(eq(games.id, gameId))
      .run();

    // Emit move event
    for (const cb of this.onMoveMadeCallbacks) {
      cb(gameId, {
        san: result.san,
        from: result.from,
        to: result.to,
        fen: game.chess.fen(),
        turn: game.chess.turn(),
        whiteTimeMs: game.whiteTimeMs,
        blackTimeMs: game.blackTimeMs,
        isCheck: game.chess.isCheck(),
        moveNumber: game.chess.history().length,
      });
    }

    // Reset timeout timer for the next player
    this.startTimeoutTimer(gameId);

    // Check for game over
    if (game.chess.isGameOver()) {
      let gameResult: "white" | "black" | "draw";
      let reason: string;

      if (game.chess.isCheckmate()) {
        // The player whose turn it is now is the one who got checkmated
        gameResult = game.chess.turn() === "w" ? "black" : "white";
        reason = "checkmate";
      } else if (game.chess.isStalemate()) {
        gameResult = "draw";
        reason = "stalemate";
      } else if (game.chess.isInsufficientMaterial()) {
        gameResult = "draw";
        reason = "insufficient_material";
      } else if (game.chess.isThreefoldRepetition()) {
        gameResult = "draw";
        reason = "threefold_repetition";
      } else if (game.chess.isDraw()) {
        gameResult = "draw";
        reason = "fifty_move_rule";
      } else {
        gameResult = "draw";
        reason = "agreement";
      }

      const eloChanges = this.finalizeGame(gameId, gameResult, reason);

      return {
        success: true,
        san: result.san,
        from: result.from,
        to: result.to,
        fen: game.chess.fen(),
        turn: game.chess.turn() as "w" | "b",
        isCheck: game.chess.isCheck(),
        isGameOver: true,
        timeRemainingMs:
          moltyColor === "w" ? game.whiteTimeMs : game.blackTimeMs,
        gameOverInfo: {
          result: gameResult,
          reason,
          ...eloChanges,
        },
      };
    }

    return {
      success: true,
      san: result.san,
      from: result.from,
      to: result.to,
      fen: game.chess.fen(),
      turn: game.chess.turn() as "w" | "b",
      isCheck: game.chess.isCheck(),
      isGameOver: false,
      timeRemainingMs:
        moltyColor === "w" ? game.whiteTimeMs : game.blackTimeMs,
    };
  }

  resign(
    gameId: string,
    moltyColor: "w" | "b"
  ): { result: string; reason: string; eloChange: number } | null {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    const result = moltyColor === "w" ? "black" : "white";
    const eloChanges = this.finalizeGame(
      gameId,
      result as "white" | "black",
      "resignation"
    );

    return {
      result,
      reason: "resignation",
      eloChange:
        moltyColor === "w"
          ? eloChanges.whiteEloChange
          : eloChanges.blackEloChange,
    };
  }

  agreeDraw(
    gameId: string
  ): { whiteEloChange: number; blackEloChange: number } | null {
    if (!this.activeGames.has(gameId)) return null;
    return this.finalizeGame(gameId, "draw", "agreement");
  }

  handleTimeout(gameId: string): void {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    // The player whose turn it is has timed out
    const timedOutColor = game.chess.turn();
    const result = timedOutColor === "w" ? "black" : "white";

    if (timedOutColor === "w") {
      game.whiteTimeMs = 0;
    } else {
      game.blackTimeMs = 0;
    }

    this.finalizeGame(gameId, result as "white" | "black", "timeout");
  }

  private startTimeoutTimer(gameId: string): void {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    // Clear existing timer
    if (game.timeoutTimer) {
      clearTimeout(game.timeoutTimer);
    }

    // Set timer for the active player's remaining time
    const timeRemaining =
      game.chess.turn() === "w" ? game.whiteTimeMs : game.blackTimeMs;

    game.timeoutTimer = setTimeout(() => {
      this.handleTimeout(gameId);
    }, timeRemaining + 500); // +500ms grace period for network latency
  }

  private finalizeGame(
    gameId: string,
    result: "white" | "black" | "draw",
    reason: string
  ): { whiteEloChange: number; blackEloChange: number } {
    const game = this.activeGames.get(gameId);

    // Clear timeout timer
    if (game?.timeoutTimer) {
      clearTimeout(game.timeoutTimer);
    }

    // Get the game record for ELO calculation
    const gameRecord = db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .get();

    if (!gameRecord) {
      this.activeGames.delete(gameId);
      return { whiteEloChange: 0, blackEloChange: 0 };
    }

    // Get players
    const white = db
      .select()
      .from(moltys)
      .where(eq(moltys.id, gameRecord.whiteId))
      .get();
    const black = db
      .select()
      .from(moltys)
      .where(eq(moltys.id, gameRecord.blackId))
      .get();

    if (!white || !black) {
      this.activeGames.delete(gameId);
      return { whiteEloChange: 0, blackEloChange: 0 };
    }

    // Calculate new ELO ratings
    const { newWhiteElo, newBlackElo } = calculateNewRatings(
      white.elo,
      black.elo,
      white.gamesPlayed,
      black.gamesPlayed,
      result
    );

    const whiteEloChange =
      Math.round((newWhiteElo - white.elo) * 10) / 10;
    const blackEloChange =
      Math.round((newBlackElo - black.elo) * 10) / 10;

    // Update game record
    db.update(games)
      .set({
        status: "completed",
        result,
        resultReason: reason as typeof gameRecord.resultReason,
        finalFen: game?.chess.fen() ?? null,
        pgn: game?.chess.pgn() ?? "",
        whiteEloEnd: newWhiteElo,
        blackEloEnd: newBlackElo,
        whiteTimeRemaining: game?.whiteTimeMs ?? 0,
        blackTimeRemaining: game?.blackTimeMs ?? 0,
        completedAt: new Date(),
      })
      .where(eq(games.id, gameId))
      .run();

    // Update white player stats
    const whiteWinInc = result === "white" ? 1 : 0;
    const whiteLossInc = result === "black" ? 1 : 0;
    const whiteDrawInc = result === "draw" ? 1 : 0;

    db.update(moltys)
      .set({
        elo: newWhiteElo,
        gamesPlayed: sql`${moltys.gamesPlayed} + 1`,
        wins: sql`${moltys.wins} + ${whiteWinInc}`,
        losses: sql`${moltys.losses} + ${whiteLossInc}`,
        draws: sql`${moltys.draws} + ${whiteDrawInc}`,
        updatedAt: new Date(),
      })
      .where(eq(moltys.id, gameRecord.whiteId))
      .run();

    // Update black player stats
    const blackWinInc = result === "black" ? 1 : 0;
    const blackLossInc = result === "white" ? 1 : 0;
    const blackDrawInc = result === "draw" ? 1 : 0;

    db.update(moltys)
      .set({
        elo: newBlackElo,
        gamesPlayed: sql`${moltys.gamesPlayed} + 1`,
        wins: sql`${moltys.wins} + ${blackWinInc}`,
        losses: sql`${moltys.losses} + ${blackLossInc}`,
        draws: sql`${moltys.draws} + ${blackDrawInc}`,
        updatedAt: new Date(),
      })
      .where(eq(moltys.id, gameRecord.blackId))
      .run();

    // Emit game over events
    for (const cb of this.onGameOverCallbacks) {
      cb(gameId, result, reason, whiteEloChange, blackEloChange);
    }

    // Remove from active games
    this.activeGames.delete(gameId);

    return { whiteEloChange, blackEloChange };
  }

  restoreActiveGames(): void {
    const activeGameRecords = db
      .select()
      .from(games)
      .where(eq(games.status, "active"))
      .all();

    for (const gameRecord of activeGameRecords) {
      // If the server restarted, abort games that were in progress
      // (clocks can't be reliably restored)
      db.update(games)
        .set({
          status: "aborted",
          result: "abort",
          resultReason: "disconnect",
          completedAt: new Date(),
        })
        .where(eq(games.id, gameRecord.id))
        .run();
    }

    console.log(
      `Aborted ${activeGameRecords.length} in-progress games after server restart`
    );
  }

  getActiveGameCount(): number {
    return this.activeGames.size;
  }

  /** Get live clock times for a game (accounting for elapsed time) */
  getLiveClocks(gameId: string): { whiteTimeMs: number; blackTimeMs: number } | null {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    const elapsed = Date.now() - game.lastMoveTimestamp;
    const whiteTimeMs =
      game.chess.turn() === "w"
        ? Math.max(0, game.whiteTimeMs - elapsed)
        : game.whiteTimeMs;
    const blackTimeMs =
      game.chess.turn() === "b"
        ? Math.max(0, game.blackTimeMs - elapsed)
        : game.blackTimeMs;

    return { whiteTimeMs, blackTimeMs };
  }
}

// Singleton via globalThis to ensure the same instance is shared across
// Next.js module boundaries (instrumentation, API routes, etc.)
const globalForGm = globalThis as unknown as { __gameManager?: GameManager };

export function getGameManager(): GameManager {
  if (!globalForGm.__gameManager) {
    globalForGm.__gameManager = new GameManager();
  }
  return globalForGm.__gameManager;
}
