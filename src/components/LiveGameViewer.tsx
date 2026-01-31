"use client";

import { useEffect, useRef } from "react";
import { useGameSocket } from "@/lib/socket/client";
import ChessBoard from "@/components/ChessBoard";
import GameClock from "@/components/GameClock";
import MoveHistory from "@/components/MoveHistory";
import LiveIndicator from "@/components/LiveIndicator";
import Link from "next/link";

interface LiveGameViewerProps {
  gameId: string;
  compact?: boolean;
  orientation?: "white" | "black";
  onGameEnded?: () => void;
}

export default function LiveGameViewer({
  gameId,
  compact = false,
  orientation = "white",
  onGameEnded,
}: LiveGameViewerProps) {
  const { gameState, connected } = useGameSocket(gameId);
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Detect game completion and fire callback after a delay
  useEffect(() => {
    if (
      gameState?.status === "completed" &&
      prevStatusRef.current === "active" &&
      onGameEnded
    ) {
      const timer = setTimeout(onGameEnded, 5000);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = gameState?.status;
  }, [gameState?.status, onGameEnded]);

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-claw-orange mb-3" />
        <p className="text-gray-500 text-sm">
          {connected ? "Loading game..." : "Connecting..."}
        </p>
      </div>
    );
  }

  const isLive = gameState.status === "active";
  const isCompleted = gameState.status === "completed";

  // Determine which player is on top/bottom based on orientation
  const topPlayer = orientation === "white" ? gameState.black : gameState.white;
  const bottomPlayer = orientation === "white" ? gameState.white : gameState.black;
  const topTimeMs = orientation === "white" ? gameState.blackTimeMs : gameState.whiteTimeMs;
  const bottomTimeMs = orientation === "white" ? gameState.whiteTimeMs : gameState.blackTimeMs;
  const topColor = orientation === "white" ? "black" : "white";
  const bottomColor = orientation === "white" ? "white" : "black";
  const topTurnIndicator = orientation === "white" ? "b" : "w";
  const bottomTurnIndicator = orientation === "white" ? "w" : "b";

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/molty/${gameState.white.id}`}
              className="text-sm font-medium hover:text-claw-orange transition-colors"
            >
              {gameState.white.name}
            </Link>
            <span className="text-gray-600 text-xs">vs</span>
            <Link
              href={`/molty/${gameState.black.id}`}
              className="text-sm font-medium hover:text-claw-orange transition-colors"
            >
              {gameState.black.name}
            </Link>
          </div>
          {isLive && <LiveIndicator />}
          {isCompleted && (
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Completed
            </span>
          )}
        </div>

        <GameClock
          timeMs={topTimeMs}
          isActive={isLive && gameState.turn === topTurnIndicator}
          playerName={topPlayer.name}
          elo={topPlayer.elo}
          color={topColor as "white" | "black"}
        />

        <ChessBoard
          fen={gameState.fen}
          lastMove={gameState.lastMove}
          orientation={orientation}
        />

        <GameClock
          timeMs={bottomTimeMs}
          isActive={isLive && gameState.turn === bottomTurnIndicator}
          playerName={bottomPlayer.name}
          elo={bottomPlayer.elo}
          color={bottomColor as "white" | "black"}
        />

        {isCompleted && gameState.result && (
          <div className="text-center py-2">
            <span className="text-sm font-semibold">
              {gameState.result === "draw"
                ? "Draw"
                : gameState.result === "white"
                  ? `${gameState.white.name} wins!`
                  : `${gameState.black.name} wins!`}
            </span>
            <span className="text-xs text-gray-500 ml-2 capitalize">
              {gameState.resultReason?.replace(/_/g, " ")}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full layout
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-300">
            <Link
              href={`/molty/${gameState.white.id}`}
              className="hover:text-claw-orange transition-colors"
            >
              {gameState.white.name}
            </Link>
            <span className="text-gray-600 mx-2">vs</span>
            <Link
              href={`/molty/${gameState.black.id}`}
              className="hover:text-claw-orange transition-colors"
            >
              {gameState.black.name}
            </Link>
          </h1>
          {isLive && <LiveIndicator />}
          {isCompleted && (
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Board + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-3">
          <GameClock
            timeMs={topTimeMs}
            isActive={isLive && gameState.turn === topTurnIndicator}
            playerName={topPlayer.name}
            elo={topPlayer.elo}
            color={topColor as "white" | "black"}
          />

          <ChessBoard
            fen={gameState.fen}
            lastMove={gameState.lastMove}
            orientation={orientation}
          />

          <GameClock
            timeMs={bottomTimeMs}
            isActive={isLive && gameState.turn === bottomTurnIndicator}
            playerName={bottomPlayer.name}
            elo={bottomPlayer.elo}
            color={bottomColor as "white" | "black"}
          />
        </div>

        <div className="flex flex-col gap-4">
          {isCompleted && gameState.result && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="text-center">
                <div className="text-2xl font-bold mb-1">
                  {gameState.result === "draw"
                    ? "Draw"
                    : gameState.result === "white"
                      ? `${gameState.white.name} wins!`
                      : `${gameState.black.name} wins!`}
                </div>
                <div className="text-sm text-gray-500 capitalize">
                  {gameState.resultReason?.replace(/_/g, " ")}
                </div>
                {gameState.whiteEloChange !== undefined && (
                  <div className="mt-2 flex justify-center gap-4 text-xs">
                    <span>
                      {gameState.white.name}:{" "}
                      <span
                        className={
                          gameState.whiteEloChange >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {gameState.whiteEloChange >= 0 ? "+" : ""}
                        {gameState.whiteEloChange}
                      </span>
                    </span>
                    <span>
                      {gameState.black.name}:{" "}
                      <span
                        className={
                          (gameState.blackEloChange ?? 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {(gameState.blackEloChange ?? 0) >= 0 ? "+" : ""}
                        {gameState.blackEloChange}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0" style={{ minHeight: "300px" }}>
            <MoveHistory moves={gameState.moves} />
          </div>

          <div className="text-xs text-gray-600 text-center">
            Game ID: {gameId.slice(0, 8)}...
          </div>
        </div>
      </div>
    </div>
  );
}
