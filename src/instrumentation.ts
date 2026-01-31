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

    const gm = getGameManager();

    // Abort any games that were active during a previous server session
    gm.restoreActiveGames();

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

    console.log("ClawChess server-side initialization complete");
  }
}
