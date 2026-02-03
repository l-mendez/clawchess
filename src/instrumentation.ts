import type { Server as SocketIOServer } from "socket.io";

export async function register() {
  // This runs once when the Next.js server starts.
  // We use it to initialize server-side singletons that need
  // access to the full TypeScript/alias resolution.

  if (typeof window === "undefined") {
    // Server-side only
    const { getGameManager } = await import("@/lib/chess/engine");
    const { startMatchmakingLoop } = await import("@/lib/matchmaking/queue");
    const { initializeSocketHandlers } = await import("@/lib/socket/server");
    const { SIMULATOR_ENABLED } = await import("@/lib/constants");
    const { ensureFakeUsers } = await import("@/lib/simulator/fake-users");
    const { startSimulatorLoop } = await import("@/lib/simulator/simulator");
    const { getTournamentManager } = await import("@/lib/tournament/manager");

    const gm = getGameManager();

    // Abort any games that were active during a previous server session
    gm.restoreActiveGames();

    // Ensure fake bot users exist in the DB
    if (SIMULATOR_ENABLED) {
      ensureFakeUsers();
    }

    // Initialize Socket.IO handlers when io is available
    const g = globalThis as Record<string, unknown>;
    const initSocket = (io: SocketIOServer) => {
      initializeSocketHandlers(io);
    };

    if (g.__io) {
      // io is already created by server.mjs
      initSocket(g.__io as SocketIOServer);
    } else {
      // io hasn't been created yet — register for later
      g.__pendingSocketInit = initSocket;
    }

    // Start the matchmaking loop
    startMatchmakingLoop((match) => {
      const io = g.__io as SocketIOServer | undefined;
      if (io) {
        const spectate = io.of("/spectate");
        spectate.to("leaderboard").emit("game_started", {
          gameId: match.gameId,
          white: { id: match.whiteId, name: match.whiteName },
          black: { id: match.blackId, name: match.blackName },
        });
      }
    });

    // Start the fake game simulator after a delay to let Socket.IO initialize
    if (SIMULATOR_ENABLED) {
      setTimeout(() => {
        startSimulatorLoop((data) => {
          const io = g.__io as SocketIOServer | undefined;
          if (io) {
            const spectate = io.of("/spectate");
            spectate.to("leaderboard").emit("game_started", {
              gameId: data.gameId,
              white: { id: data.whiteId, name: data.whiteName },
              black: { id: data.blackId, name: data.blackName },
            });
          }
        });
      }, 15000);
    }

    // Initialize tournament manager
    const tm = getTournamentManager();
    tm.initialize();

    console.log("ClawChess server-side initialization complete");
  }
}
