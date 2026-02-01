import type { Server as SocketIOServer, Socket } from "socket.io";
import { getGameManager } from "@/lib/chess/engine";
import { getGameById, getMovesForGame, getMoltyById, getQueueCount } from "@/lib/db/queries";
import { MAX_WS_CONNECTIONS_PER_IP } from "@/lib/constants";
import { notifyMoveMade } from "@/lib/simulator/bot-player";

const ipConnectionCounts = new Map<string, number>();

function getSocketIp(socket: Socket): string {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return socket.handshake.address;
}

export function initializeSocketHandlers(io: SocketIOServer): void {
  const spectate = io.of("/spectate");

  // Connection rate limiting
  spectate.use((socket, next) => {
    const ip = getSocketIp(socket);
    const count = ipConnectionCounts.get(ip) || 0;

    if (count >= MAX_WS_CONNECTIONS_PER_IP) {
      return next(new Error("Too many connections from this IP"));
    }

    ipConnectionCounts.set(ip, count + 1);
    next();
  });

  spectate.on("connection", (socket) => {
    const ip = getSocketIp(socket);

    socket.on("join_game", ({ gameId }: { gameId: string }) => {
      if (typeof gameId !== "string" || gameId.length > 50) return;

      // Verify the game exists
      const game = getGameById(gameId);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      socket.join(`game:${gameId}`);

      // Send current game state
      const gm = getGameManager();

      const white = getMoltyById(game.whiteId);
      const black = getMoltyById(game.blackId);

      if (gm.isActive(gameId)) {
        const state = gm.getState(gameId);
        if (state) {
          const movesHistory = getMovesForGame(gameId);
          socket.emit("game_state", {
            id: gameId,
            white: {
              id: game.whiteId,
              name: white?.name,
              elo: game.whiteEloStart,
            },
            black: {
              id: game.blackId,
              name: black?.name,
              elo: game.blackEloStart,
            },
            status: "active",
            fen: state.fen,
            pgn: state.pgn,
            turn: state.turn,
            moveCount: state.moveCount,
            whiteTimeMs: state.whiteTimeMs,
            blackTimeMs: state.blackTimeMs,
            isCheck: state.isCheck,
            lastMove: state.lastMove,
            moves: movesHistory.map((m) => ({
              san: m.san,
              color: m.color,
              moveNumber: m.moveNumber,
            })),
          });
        }
      } else {
        // Game is completed
        const movesHistory = getMovesForGame(gameId);
        socket.emit("game_state", {
          id: gameId,
          white: {
            id: game.whiteId,
            name: white?.name,
            elo: game.whiteEloStart,
          },
          black: {
            id: game.blackId,
            name: black?.name,
            elo: game.blackEloStart,
          },
          status: game.status,
          fen: game.finalFen,
          pgn: game.pgn,
          turn: null,
          moveCount: game.moveCount,
          whiteTimeMs: game.whiteTimeRemaining,
          blackTimeMs: game.blackTimeRemaining,
          isCheck: false,
          lastMove: null,
          result: game.result,
          resultReason: game.resultReason,
          whiteEloChange: game.whiteEloEnd
            ? Math.round((game.whiteEloEnd - game.whiteEloStart) * 10) / 10
            : null,
          blackEloChange: game.blackEloEnd
            ? Math.round((game.blackEloEnd - game.blackEloStart) * 10) / 10
            : null,
          moves: movesHistory.map((m) => ({
            san: m.san,
            color: m.color,
            moveNumber: m.moveNumber,
          })),
        });
      }
    });

    socket.on("leave_game", ({ gameId }: { gameId: string }) => {
      if (typeof gameId !== "string") return;
      socket.leave(`game:${gameId}`);
    });

    socket.on("join_leaderboard", () => {
      socket.join("leaderboard");

      // Send current queue count
      const count = getQueueCount();
      socket.emit("queue_count", { count });
    });

    socket.on("leave_leaderboard", () => {
      socket.leave("leaderboard");
    });

    socket.on("disconnect", () => {
      const count = ipConnectionCounts.get(ip) || 1;
      if (count <= 1) {
        ipConnectionCounts.delete(ip);
      } else {
        ipConnectionCounts.set(ip, count - 1);
      }
    });
  });

  // Wire up GameManager events to Socket.IO broadcasts
  const gm = getGameManager();

  gm.setOnMoveMade((gameId, data) => {
    spectate.to(`game:${gameId}`).emit("move_made", {
      san: data.san,
      from: data.from,
      to: data.to,
      fen: data.fen,
      turn: data.turn,
      whiteTimeMs: data.whiteTimeMs,
      blackTimeMs: data.blackTimeMs,
      isCheck: data.isCheck,
      moveNumber: data.moveNumber,
    });

    // Wake up bot player if this game has a bot session
    notifyMoveMade(gameId);
  });

  gm.setOnGameOver((gameId, result, reason, whiteEloChange, blackEloChange) => {
    spectate.to(`game:${gameId}`).emit("game_over", {
      result,
      reason,
      whiteEloChange,
      blackEloChange,
    });

    // Also notify leaderboard subscribers
    spectate.to("leaderboard").emit("leaderboard_update", {});
  });

  // Periodic clock tick broadcast for active games
  setInterval(() => {
    // For each active game room, broadcast clock ticks
    const rooms = spectate.adapter.rooms;
    for (const [room] of rooms) {
      if (!room.startsWith("game:")) continue;
      const gameId = room.slice(5);

      const clocks = gm.getLiveClocks(gameId);
      if (clocks) {
        spectate.to(room).emit("clock_tick", clocks);
      }
    }
  }, 1000);

  // Periodic queue count broadcast
  setInterval(() => {
    const count = getQueueCount();
    spectate.to("leaderboard").emit("queue_count", { count });
  }, 5000);

  console.log("Socket.IO handlers initialized");
}
