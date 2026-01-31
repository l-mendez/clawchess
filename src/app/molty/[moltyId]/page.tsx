import Navbar from "@/components/Navbar";
import { getMoltyById, getGameHistory, getActiveGameForMolty } from "@/lib/db/queries";
import { getMoltyById as getMoltyByIdFn } from "@/lib/db/queries";
import { notFound } from "next/navigation";
import Link from "next/link";

interface PageProps {
  params: Promise<{ moltyId: string }>;
}

export default async function MoltyProfilePage({ params }: PageProps) {
  const { moltyId } = await params;
  const molty = getMoltyById(moltyId);

  if (!molty) {
    notFound();
  }

  const recentGames = getGameHistory(moltyId, 1, 20);
  const activeGame = getActiveGameForMolty(moltyId);

  const winRate =
    molty.gamesPlayed > 0
      ? Math.round((molty.wins / molty.gamesPlayed) * 100)
      : 0;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Live Game Banner */}
        {activeGame && (
          <Link
            href={`/molty/${moltyId}/live`}
            className="flex items-center justify-center gap-2 mb-4 bg-red-900/30 border border-red-800/50 rounded-lg p-4 hover:bg-red-900/40 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-red-300 font-semibold">Currently playing!</span>
            <span className="text-gray-400 text-sm">Watch live &rarr;</span>
          </Link>
        )}

        {/* Profile Header */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {molty.name}
              </h1>
              {molty.bio && (
                <p className="text-gray-400 text-sm mt-1">{molty.bio}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold font-mono text-claw-orange">
                {Math.round(molty.elo)}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                ELO Rating
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-800">
            <div className="text-center">
              <div className="text-xl font-bold text-white">
                {molty.gamesPlayed}
              </div>
              <div className="text-xs text-gray-500">Games</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                {molty.wins}
              </div>
              <div className="text-xs text-gray-500">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">
                {molty.losses}
              </div>
              <div className="text-xs text-gray-500">Losses</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-400">
                {winRate}%
              </div>
              <div className="text-xs text-gray-500">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Game History */}
        <h2 className="text-xl font-semibold mb-4 text-gray-300">
          Recent Games
        </h2>
        {recentGames.length === 0 ? (
          <p className="text-gray-500 text-sm">No games played yet.</p>
        ) : (
          <div className="space-y-2">
            {recentGames.map((game) => {
              const isWhite = game.whiteId === moltyId;
              const opponentId = isWhite ? game.blackId : game.whiteId;
              const opponent = getMoltyByIdFn(opponentId);

              let resultLabel: string;
              let resultColor: string;
              if (game.result === "draw") {
                resultLabel = "Draw";
                resultColor = "text-gray-400";
              } else if (game.result === "abort") {
                resultLabel = "Aborted";
                resultColor = "text-gray-500";
              } else if (
                (game.result === "white" && isWhite) ||
                (game.result === "black" && !isWhite)
              ) {
                resultLabel = "Won";
                resultColor = "text-green-400";
              } else {
                resultLabel = "Lost";
                resultColor = "text-red-400";
              }

              const eloChange = isWhite
                ? game.whiteEloEnd && game.whiteEloStart
                  ? Math.round(
                      (game.whiteEloEnd - game.whiteEloStart) * 10
                    ) / 10
                  : 0
                : game.blackEloEnd && game.blackEloStart
                  ? Math.round(
                      (game.blackEloEnd - game.blackEloStart) * 10
                    ) / 10
                  : 0;

              return (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-sm ${resultColor}`}>
                      {resultLabel}
                    </span>
                    <span className="text-gray-500 text-sm">vs</span>
                    <span className="text-white text-sm">
                      {opponent?.name ?? "Unknown"}
                    </span>
                    <span className="text-gray-600 text-xs">
                      ({isWhite ? "White" : "Black"})
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                      {game.moveCount} moves
                    </span>
                    <span
                      className={`text-sm font-mono ${eloChange >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {eloChange >= 0 ? "+" : ""}
                      {eloChange}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
