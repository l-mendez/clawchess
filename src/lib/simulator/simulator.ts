import { v4 as uuidv4 } from "uuid";
import { Chess } from "chess.js";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { getGameManager } from "@/lib/chess/engine";
import { pruneOldSimulatedGames } from "@/lib/db/queries";
import { getRandomFakeUserPair } from "./fake-users";
import { FAMOUS_GAMES, type FamousGame } from "./pgn-library";
import {
  DEFAULT_TIME_CONTROL_SECONDS,
  DEFAULT_INCREMENT_SECONDS,
  SIMULATOR_CHECK_INTERVAL_MS,
  SIMULATOR_MIN_LIVE_GAMES,
  SIMULATOR_MAX_LIVE_GAMES,
  SIMULATOR_TARGET_REROLL_MS,
  SIMULATOR_OPENING_PLIES,
  SIMULATOR_OPENING_MOVE_DELAY_MS,
  SIMULATOR_MOVE_DELAY_MS,
  SIMULATOR_LONG_THINK_CHANCE,
  SIMULATOR_LONG_THINK_DELAY_MS,
  SIMULATOR_MAX_CLOCK_FRACTION,
  SIMULATOR_BOT_REST_MS,
  SIMULATOR_MAX_STORED_GAMES,
  SIMULATOR_PRUNE_INTERVAL_MS,
  SIMULATOR_PRUNE_BATCH_SIZE,
} from "@/lib/constants";

interface ActiveSimulation {
  gameId: string;
  whiteId: string;
  blackId: string;
  moves: string[];
  result: FamousGame["result"];
  currentMoveIndex: number;
  timer: ReturnType<typeof setTimeout> | null;
}

interface GameStartedData {
  gameId: string;
  whiteId: string;
  blackId: string;
  whiteName: string;
  blackName: string;
}

const activeSimulations = new Map<string, ActiveSimulation>();
// Bot id -> timestamp until which the bot is resting and won't start a new game
const restingUntil = new Map<string, number>();

function randomBetween(range: { min: number; max: number }): number {
  return range.min + Math.random() * (range.max - range.min);
}

/** Human-like think time: fast opening, slower middlegame, occasional long think. */
function getThinkDelay(sim: ActiveSimulation): number {
  let delay: number;
  if (sim.currentMoveIndex < SIMULATOR_OPENING_PLIES) {
    delay = randomBetween(SIMULATOR_OPENING_MOVE_DELAY_MS);
  } else if (Math.random() < SIMULATOR_LONG_THINK_CHANCE) {
    delay = randomBetween(SIMULATOR_LONG_THINK_DELAY_MS);
  } else {
    delay = randomBetween(SIMULATOR_MOVE_DELAY_MS);
  }

  // Don't let a scripted game lose on time
  const clocks = getGameManager().getLiveClocks(sim.gameId);
  if (clocks) {
    const remaining =
      sim.currentMoveIndex % 2 === 0 ? clocks.whiteTimeMs : clocks.blackTimeMs;
    delay = Math.min(delay, remaining * SIMULATOR_MAX_CLOCK_FRACTION);
  }
  return delay;
}

function endSimulation(sim: ActiveSimulation): void {
  if (sim.timer) clearTimeout(sim.timer);
  activeSimulations.delete(sim.gameId);
  const now = Date.now();
  restingUntil.set(sim.whiteId, now + randomBetween(SIMULATOR_BOT_REST_MS));
  restingUntil.set(sim.blackId, now + randomBetween(SIMULATOR_BOT_REST_MS));
}

function getRestingBotIds(): Set<string> {
  const now = Date.now();
  const resting = new Set<string>();
  for (const [id, until] of restingUntil) {
    if (until > now) resting.add(id);
    else restingUntil.delete(id);
  }
  return resting;
}

/**
 * The scripted moves ran out without a natural game end — finish the way the
 * real game did: the losing side resigns, or the players agree a draw.
 */
function concludeGame(sim: ActiveSimulation): void {
  const gm = getGameManager();
  if (sim.result === "draw") {
    gm.agreeDraw(sim.gameId);
  } else {
    gm.resign(sim.gameId, sim.result === "white" ? "b" : "w");
  }
  console.log(
    `[Simulator] Fake game ${sim.gameId} ended: ${sim.result} by ${sim.result === "draw" ? "agreement" : "resignation"}`
  );
  endSimulation(sim);
}

// Some library entries contain transcription errors partway through. Trim
// each game to its legal prefix so a replay never gets stuck on a bad move.
const PLAYABLE_GAMES: FamousGame[] = FAMOUS_GAMES.map((game) => {
  const chess = new Chess();
  const moves: string[] = [];
  for (const san of game.moves) {
    try {
      chess.move(san);
    } catch {
      break;
    }
    moves.push(san);
  }
  return { ...game, moves };
});

function pickRandomGame(): FamousGame {
  return PLAYABLE_GAMES[Math.floor(Math.random() * PLAYABLE_GAMES.length)];
}

function scheduleNextMove(sim: ActiveSimulation): void {
  const delay = getThinkDelay(sim);
  sim.timer = setTimeout(() => playNextMove(sim), delay);
}

function playNextMove(sim: ActiveSimulation): void {
  const gm = getGameManager();

  if (!gm.isActive(sim.gameId)) {
    endSimulation(sim);
    return;
  }

  if (sim.currentMoveIndex >= sim.moves.length) {
    concludeGame(sim);
    return;
  }

  const moveSan = sim.moves[sim.currentMoveIndex];
  const turn: "w" | "b" = sim.currentMoveIndex % 2 === 0 ? "w" : "b";

  const result = gm.makeMove(sim.gameId, moveSan, turn);

  if (!result.success) {
    console.error(
      `[Simulator] Move failed for game ${sim.gameId}: ${(result as { error: string }).error}`
    );
    concludeGame(sim);
    return;
  }

  sim.currentMoveIndex++;

  if (result.success && result.isGameOver) {
    console.log(
      `[Simulator] Fake game ${sim.gameId} ended: ${result.gameOverInfo?.result} by ${result.gameOverInfo?.reason}`
    );
    endSimulation(sim);
    return;
  }

  scheduleNextMove(sim);
}

function spawnFakeGame(onGameStarted?: (data: GameStartedData) => void): void {
  const pair = getRandomFakeUserPair(getRestingBotIds());
  if (!pair) return;

  const [player1, player2] = pair;
  const whiteFirst = Math.random() < 0.5;
  const white = whiteFirst ? player1 : player2;
  const black = whiteFirst ? player2 : player1;

  const famousGame = pickRandomGame();
  const gameId = uuidv4();
  const timeControlMs = DEFAULT_TIME_CONTROL_SECONDS * 1000;
  const incrementMs = DEFAULT_INCREMENT_SECONDS * 1000;

  db.insert(games)
    .values({
      id: gameId,
      whiteId: white.id,
      blackId: black.id,
      status: "active",
      whiteEloStart: white.elo,
      blackEloStart: black.elo,
      timeControlSeconds: DEFAULT_TIME_CONTROL_SECONDS,
      incrementSeconds: DEFAULT_INCREMENT_SECONDS,
      whiteTimeRemaining: timeControlMs,
      blackTimeRemaining: timeControlMs,
      startedAt: new Date(),
    })
    .run();

  const gm = getGameManager();
  gm.createGame(gameId, timeControlMs, incrementMs);

  if (onGameStarted) {
    onGameStarted({
      gameId,
      whiteId: white.id,
      blackId: black.id,
      whiteName: white.name,
      blackName: black.name,
    });
  }

  console.log(
    `[Simulator] Spawned fake game: ${white.name} vs ${black.name} (${famousGame.moves.length} moves) — Game ${gameId}`
  );

  const sim: ActiveSimulation = {
    gameId,
    whiteId: white.id,
    blackId: black.id,
    moves: famousGame.moves,
    result: famousGame.result,
    currentMoveIndex: 0,
    timer: null,
  };
  activeSimulations.set(gameId, sim);

  scheduleNextMove(sim);
}

let simulatorInterval: ReturnType<typeof setInterval> | null = null;
let pruneInterval: ReturnType<typeof setInterval> | null = null;
let targetLiveGames = SIMULATOR_MIN_LIVE_GAMES;
let targetRolledAt = 0;

function getTargetLiveGames(): number {
  const now = Date.now();
  if (now - targetRolledAt >= SIMULATOR_TARGET_REROLL_MS) {
    targetLiveGames =
      SIMULATOR_MIN_LIVE_GAMES +
      Math.floor(
        Math.random() * (SIMULATOR_MAX_LIVE_GAMES - SIMULATOR_MIN_LIVE_GAMES + 1)
      );
    targetRolledAt = now;
  }
  return targetLiveGames;
}

function pruneStoredGames(): void {
  try {
    const deleted = pruneOldSimulatedGames(
      SIMULATOR_MAX_STORED_GAMES,
      SIMULATOR_PRUNE_BATCH_SIZE
    );
    if (deleted > 0) {
      console.log(`[Simulator] Pruned ${deleted} old fake games`);
    }
  } catch (err) {
    console.error("[Simulator] Prune error:", err);
  }
}

export function startSimulatorLoop(
  onGameStarted?: (data: GameStartedData) => void
): void {
  if (simulatorInterval) return;

  console.log(
    `[Simulator] Loop started (checking every ${SIMULATOR_CHECK_INTERVAL_MS / 1000}s, ${SIMULATOR_MIN_LIVE_GAMES}-${SIMULATOR_MAX_LIVE_GAMES} live games)`
  );

  simulatorInterval = setInterval(() => {
    try {
      const gm = getGameManager();
      // Start at most one game per tick so games don't all begin in lockstep
      if (gm.getActiveGameCount() < getTargetLiveGames()) {
        spawnFakeGame(onGameStarted);
      }
    } catch (err) {
      console.error("[Simulator] Error:", err);
    }
  }, SIMULATOR_CHECK_INTERVAL_MS);

  pruneStoredGames();
  pruneInterval = setInterval(pruneStoredGames, SIMULATOR_PRUNE_INTERVAL_MS);
}

export function stopSimulatorLoop(): void {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  if (pruneInterval) {
    clearInterval(pruneInterval);
    pruneInterval = null;
  }
  for (const [, sim] of activeSimulations) {
    if (sim.timer) clearTimeout(sim.timer);
  }
  activeSimulations.clear();
}
