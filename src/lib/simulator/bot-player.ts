import { getGameManager } from "@/lib/chess/engine";
import {
  BOT_MOVE_MIN_DELAY_MS,
  BOT_MOVE_MAX_DELAY_MS,
  BOT_OPENING_BOOK_DEPTH,
} from "@/lib/constants";

// ── Opening Book ──
// Keys are FEN position signatures (piece placement, turn, castling, en passant).
// Values are arrays of candidate SAN moves ordered by preference.
const OPENING_BOOK: Record<string, string[]> = {
  // Starting position — White's first move
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -": [
    "e4",
    "d4",
    "Nf3",
    "c4",
  ],

  // After 1.e4 — Black
  "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -": [
    "e5",
    "c5",
    "e6",
    "c6",
  ],

  // After 1.d4 — Black
  "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -": [
    "d5",
    "Nf6",
    "e6",
    "f5",
  ],

  // After 1.e4 e5 — White
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [
    "Nf3",
    "Bc4",
    "f4",
    "Nc3",
  ],

  // After 1.e4 e5 2.Nf3 — Black
  "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -": [
    "Nc6",
    "Nf6",
    "d6",
  ],

  // After 1.e4 c5 (Sicilian) — White
  "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [
    "Nf3",
    "Nc3",
    "c3",
    "d4",
  ],

  // After 1.d4 d5 — White
  "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": [
    "c4",
    "Nf3",
    "Bf4",
    "e3",
  ],

  // After 1.d4 Nf6 — White
  "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -": [
    "c4",
    "Nf3",
    "Bg5",
  ],

  // After 1.e4 e5 2.Nf3 Nc6 — White (Ruy Lopez / Italian)
  "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -": [
    "Bb5",
    "Bc4",
    "d4",
  ],

  // After 1.e4 e5 2.Nf3 Nc6 3.Bb5 — Black (Ruy Lopez)
  "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq -": [
    "a6",
    "Nf6",
    "f5",
  ],

  // After 1.d4 d5 2.c4 — Black (Queen's Gambit)
  "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -": [
    "e6",
    "c6",
    "dxc4",
  ],

  // After 1.Nf3 — Black
  "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq -": [
    "d5",
    "Nf6",
    "c5",
    "g6",
  ],

  // After 1.c4 — Black (English)
  "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq -": [
    "e5",
    "Nf6",
    "c5",
    "e6",
  ],

  // After 1.e4 e6 (French) — White
  "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [
    "d4",
    "d3",
    "Nf3",
  ],

  // After 1.e4 c6 (Caro-Kann) — White
  "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -": [
    "d4",
    "Nc3",
    "Nf3",
  ],
};

/**
 * Extract position key from FEN (first 4 fields, stripping move counters
 * so transpositions that differ only in move number still match).
 */
function fenPositionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/**
 * Pick a move for the bot given the current game state.
 * Uses opening book for early moves, random legal moves after.
 */
function pickBotMove(gameId: string): string | null {
  const gm = getGameManager();
  const state = gm.getState(gameId);
  if (!state || state.isGameOver || state.legalMoves.length === 0) return null;

  // Calculate half-move count from FEN
  const fenParts = state.fen.split(" ");
  const fullMoveNumber = parseInt(fenParts[5], 10);
  const isBlackTurn = fenParts[1] === "b";
  const halfMoves = (fullMoveNumber - 1) * 2 + (isBlackTurn ? 1 : 0);

  // Try opening book
  if (halfMoves < BOT_OPENING_BOOK_DEPTH) {
    const posKey = fenPositionKey(state.fen);
    const bookMoves = OPENING_BOOK[posKey];
    if (bookMoves && bookMoves.length > 0) {
      const legalBookMoves = bookMoves.filter((m) =>
        state.legalMoves.includes(m)
      );
      if (legalBookMoves.length > 0) {
        // Weighted random: ~50% first choice, ~25% second, etc.
        for (const move of legalBookMoves) {
          if (
            Math.random() < 0.5 ||
            move === legalBookMoves[legalBookMoves.length - 1]
          ) {
            return move;
          }
        }
        return legalBookMoves[0];
      }
    }
  }

  // Random legal move
  return state.legalMoves[Math.floor(Math.random() * state.legalMoves.length)];
}

// ── Active Bot Game Sessions ──

interface ActiveBotSession {
  gameId: string;
  botMoltyId: string;
  botColor: "w" | "b";
  timer: ReturnType<typeof setTimeout> | null;
}

const activeBotSessions = new Map<string, ActiveBotSession>();

function getRandomBotDelay(): number {
  return (
    BOT_MOVE_MIN_DELAY_MS +
    Math.random() * (BOT_MOVE_MAX_DELAY_MS - BOT_MOVE_MIN_DELAY_MS)
  );
}

/**
 * Start a bot session for a game. The bot will make moves on a timer
 * whenever it's the bot's turn.
 */
export function startBotSession(
  gameId: string,
  botMoltyId: string,
  botColor: "w" | "b"
): void {
  if (activeBotSessions.has(gameId)) return;

  const session: ActiveBotSession = {
    gameId,
    botMoltyId,
    botColor,
    timer: null,
  };
  activeBotSessions.set(gameId, session);

  console.log(
    `[BotPlayer] Started session for game ${gameId}, bot ${botMoltyId} as ${botColor === "w" ? "white" : "black"}`
  );

  scheduleBotMoveIfNeeded(session);
}

function scheduleBotMoveIfNeeded(session: ActiveBotSession): void {
  const gm = getGameManager();

  if (!gm.isActive(session.gameId)) {
    cleanupSession(session.gameId);
    return;
  }

  const state = gm.getState(session.gameId);
  if (!state || state.isGameOver) {
    cleanupSession(session.gameId);
    return;
  }

  if (state.turn === session.botColor) {
    const delay = getRandomBotDelay();
    session.timer = setTimeout(() => makeBotMove(session), delay);
  } else {
    // Human's turn — poll as safety net (notifyMoveMade provides faster wake-up)
    session.timer = setTimeout(
      () => scheduleBotMoveIfNeeded(session),
      2000
    );
  }
}

function makeBotMove(session: ActiveBotSession): void {
  const gm = getGameManager();

  if (!gm.isActive(session.gameId)) {
    cleanupSession(session.gameId);
    return;
  }

  const move = pickBotMove(session.gameId);
  if (!move) {
    cleanupSession(session.gameId);
    return;
  }

  const result = gm.makeMove(session.gameId, move, session.botColor);

  if (!result.success) {
    console.error(
      `[BotPlayer] Move failed for game ${session.gameId}: ${(result as { error: string }).error}`
    );
    cleanupSession(session.gameId);
    return;
  }

  if (result.success && result.isGameOver) {
    console.log(
      `[BotPlayer] Game ${session.gameId} ended: ${result.gameOverInfo?.result} by ${result.gameOverInfo?.reason}`
    );
    cleanupSession(session.gameId);
    return;
  }

  scheduleBotMoveIfNeeded(session);
}

function cleanupSession(gameId: string): void {
  const session = activeBotSessions.get(gameId);
  if (session?.timer) {
    clearTimeout(session.timer);
  }
  activeBotSessions.delete(gameId);
}

/**
 * Notify that a move was made in a game. Wakes the bot up instantly
 * if it's now the bot's turn (faster than the 2s poll).
 * No-op for games without a bot session.
 */
export function notifyMoveMade(gameId: string): void {
  const session = activeBotSessions.get(gameId);
  if (!session) return;

  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }

  scheduleBotMoveIfNeeded(session);
}

export function stopAllBotSessions(): void {
  for (const [, session] of activeBotSessions) {
    if (session.timer) clearTimeout(session.timer);
  }
  activeBotSessions.clear();
}
