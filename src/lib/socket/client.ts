"use client";

import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState, useCallback } from "react";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io("/spectate", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }
  return socket;
}

export interface GameStateEvent {
  id: string;
  white: { id: string; name: string; elo: number };
  black: { id: string; name: string; elo: number };
  status: string;
  fen: string;
  pgn: string;
  turn: "w" | "b" | null;
  moveCount: number;
  whiteTimeMs: number;
  blackTimeMs: number;
  isCheck: boolean;
  lastMove: { san: string; from: string; to: string } | null;
  result?: string;
  resultReason?: string;
  whiteEloChange?: number;
  blackEloChange?: number;
  moves: Array<{ san: string; color: string; moveNumber: number }>;
}

export interface MoveEvent {
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

export interface GameOverEvent {
  result: string;
  reason: string;
  whiteEloChange: number;
  blackEloChange: number;
}

export interface ClockEvent {
  whiteTimeMs: number;
  blackTimeMs: number;
}

export function useGameSocket(gameId: string | null) {
  const [gameState, setGameState] = useState<GameStateEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onGameState = (state: GameStateEvent) => {
      setGameState(state);
    };

    const onMoveMade = (data: MoveEvent) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fen: data.fen,
          turn: data.turn as "w" | "b",
          whiteTimeMs: data.whiteTimeMs,
          blackTimeMs: data.blackTimeMs,
          isCheck: data.isCheck,
          lastMove: { san: data.san, from: data.from, to: data.to },
          moveCount: data.moveNumber,
          moves: [
            ...prev.moves,
            { san: data.san, color: data.turn === "w" ? "b" : "w", moveNumber: data.moveNumber },
          ],
        };
      });
    };

    const onGameOver = (data: GameOverEvent) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: "completed",
          turn: null,
          result: data.result,
          resultReason: data.reason,
          whiteEloChange: data.whiteEloChange,
          blackEloChange: data.blackEloChange,
        };
      });
    };

    const onClockTick = (data: ClockEvent) => {
      setGameState((prev) => {
        if (!prev || prev.status !== "active") return prev;
        return {
          ...prev,
          whiteTimeMs: data.whiteTimeMs,
          blackTimeMs: data.blackTimeMs,
        };
      });
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("game_state", onGameState);
    s.on("move_made", onMoveMade);
    s.on("game_over", onGameOver);
    s.on("clock_tick", onClockTick);

    if (!s.connected) {
      s.connect();
    }

    s.emit("join_game", { gameId });
    setConnected(s.connected);

    return () => {
      s.emit("leave_game", { gameId });
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("game_state", onGameState);
      s.off("move_made", onMoveMade);
      s.off("game_over", onGameOver);
      s.off("clock_tick", onClockTick);
    };
  }, [gameId]);

  return { gameState, connected };
}

export function useLeaderboardSocket() {
  const [queueCount, setQueueCount] = useState(0);
  const [leaderboardUpdated, setLeaderboardUpdated] = useState(0);
  const [gameStarted, setGameStarted] = useState<{
    gameId: string;
    white: { id: string; name: string };
    black: { id: string; name: string };
  } | null>(null);

  useEffect(() => {
    const s = getSocket();

    const onQueueCount = (data: { count: number }) => {
      setQueueCount(data.count);
    };

    const onLeaderboardUpdate = () => {
      setLeaderboardUpdated((prev) => prev + 1);
    };

    const onGameStarted = (data: {
      gameId: string;
      white: { id: string; name: string };
      black: { id: string; name: string };
    }) => {
      setGameStarted(data);
    };

    s.on("queue_count", onQueueCount);
    s.on("leaderboard_update", onLeaderboardUpdate);
    s.on("game_started", onGameStarted);

    if (!s.connected) {
      s.connect();
    }

    s.emit("join_leaderboard");

    return () => {
      s.emit("leave_leaderboard");
      s.off("queue_count", onQueueCount);
      s.off("leaderboard_update", onLeaderboardUpdate);
      s.off("game_started", onGameStarted);
    };
  }, []);

  return { queueCount, leaderboardUpdated, gameStarted };
}
