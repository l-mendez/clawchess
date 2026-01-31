"use client";

import { useParams } from "next/navigation";
import { useGameSocket } from "@/lib/socket/client";
import ChessBoard from "@/components/ChessBoard";
import GameClock from "@/components/GameClock";
import MoveHistory from "@/components/MoveHistory";
import LiveIndicator from "@/components/LiveIndicator";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function GamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const { gameState, connected } = useGameSocket(gameId);

  if (!gameState) {
    return (
      <>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-claw-orange mb-4" />
            <p className="text-gray-500">
              {connected ? "Loading game..." : "Connecting..."}
            </p>
          </div>
        </main>
      </>
    );
  }

  const isLive = gameState.status === "active";
  const isCompleted = gameState.status === "completed";

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
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

        {/* Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Board + Clocks */}
          <div className="flex flex-col gap-3">
            {/* Black clock (top) */}
            <GameClock
              timeMs={gameState.blackTimeMs}
              isActive={isLive && gameState.turn === "b"}
              playerName={gameState.black.name}
              elo={gameState.black.elo}
              color="black"
            />

            {/* Chess Board */}
            <ChessBoard
              fen={gameState.fen}
              lastMove={gameState.lastMove}
              orientation="white"
            />

            {/* White clock (bottom) */}
            <GameClock
              timeMs={gameState.whiteTimeMs}
              isActive={isLive && gameState.turn === "w"}
              playerName={gameState.white.name}
              elo={gameState.white.elo}
              color="white"
            />
          </div>

          {/* Sidebar: Move history + Result */}
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
      </main>
    </>
  );
}
