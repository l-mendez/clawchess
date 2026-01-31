import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { getGameManager } from "@/lib/chess/engine";
import { getRandomFakeUserPair } from "./fake-users";
import { FAMOUS_GAMES, type FamousGame } from "./pgn-library";
import {
  DEFAULT_TIME_CONTROL_SECONDS,
  DEFAULT_INCREMENT_SECONDS,
  SIMULATOR_CHECK_INTERVAL_MS,
  SIMULATOR_MIN_LIVE_GAMES,
  SIMULATOR_MIN_FAKE_GAMES,
  SIMULATOR_MAX_FAKE_GAMES,
  SIMULATOR_MIN_MOVE_DELAY_MS,
  SIMULATOR_MAX_MOVE_DELAY_MS,
} from "@/lib/constants";

interface ActiveSimulation {
  gameId: string;
  moves: string[];
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

function getRandomDelay(): number {
  return (
    SIMULATOR_MIN_MOVE_DELAY_MS +
    Math.random() * (SIMULATOR_MAX_MOVE_DELAY_MS - SIMULATOR_MIN_MOVE_DELAY_MS)
  );
}

function pickRandomGame(): FamousGame {
  return FAMOUS_GAMES[Math.floor(Math.random() * FAMOUS_GAMES.length)];
}

function scheduleNextMove(sim: ActiveSimulation): void {
  const delay = getRandomDelay();
  sim.timer = setTimeout(() => playNextMove(sim), delay);
}

function playNextMove(sim: ActiveSimulation): void {
  const gm = getGameManager();

  if (!gm.isActive(sim.gameId)) {
    activeSimulations.delete(sim.gameId);
    return;
  }

  if (sim.currentMoveIndex >= sim.moves.length) {
    activeSimulations.delete(sim.gameId);
    return;
  }

  const moveSan = sim.moves[sim.currentMoveIndex];
  const turn: "w" | "b" = sim.currentMoveIndex % 2 === 0 ? "w" : "b";

  const result = gm.makeMove(sim.gameId, moveSan, turn);

  if (!result.success) {
    console.error(
      `[Simulator] Move failed for game ${sim.gameId}: ${(result as { error: string }).error}`
    );
    activeSimulations.delete(sim.gameId);
    return;
  }

  sim.currentMoveIndex++;

  if (result.success && result.isGameOver) {
    console.log(
      `[Simulator] Fake game ${sim.gameId} ended: ${result.gameOverInfo?.result} by ${result.gameOverInfo?.reason}`
    );
    activeSimulations.delete(sim.gameId);
    return;
  }

  scheduleNextMove(sim);
}

function spawnFakeGame(onGameStarted?: (data: GameStartedData) => void): void {
  const pair = getRandomFakeUserPair();
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
    moves: famousGame.moves,
    currentMoveIndex: 0,
    timer: null,
  };
  activeSimulations.set(gameId, sim);

  scheduleNextMove(sim);
}

let simulatorInterval: ReturnType<typeof setInterval> | null = null;

export function startSimulatorLoop(
  onGameStarted?: (data: GameStartedData) => void
): void {
  if (simulatorInterval) return;

  console.log(
    `[Simulator] Loop started (checking every ${SIMULATOR_CHECK_INTERVAL_MS / 1000}s, threshold: ${SIMULATOR_MIN_LIVE_GAMES} live games)`
  );

  simulatorInterval = setInterval(() => {
    try {
      const gm = getGameManager();
      const activeCount = gm.getActiveGameCount();

      if (activeCount < SIMULATOR_MIN_LIVE_GAMES) {
        const currentSimCount = activeSimulations.size;
        const deficit = SIMULATOR_MIN_LIVE_GAMES - activeCount;
        const maxNew = SIMULATOR_MAX_FAKE_GAMES - currentSimCount;

        if (maxNew <= 0) return;

        const numToSpawn = Math.min(
          maxNew,
          deficit,
          SIMULATOR_MIN_FAKE_GAMES +
            Math.floor(
              Math.random() *
                (SIMULATOR_MAX_FAKE_GAMES - SIMULATOR_MIN_FAKE_GAMES + 1)
            )
        );

        for (let i = 0; i < numToSpawn; i++) {
          spawnFakeGame(onGameStarted);
        }
      }
    } catch (err) {
      console.error("[Simulator] Error:", err);
    }
  }, SIMULATOR_CHECK_INTERVAL_MS);
}

export function stopSimulatorLoop(): void {
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  for (const [, sim] of activeSimulations) {
    if (sim.timer) clearTimeout(sim.timer);
  }
  activeSimulations.clear();
}
