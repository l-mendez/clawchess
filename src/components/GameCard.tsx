import Link from "next/link";

interface GameCardProps {
  gameId: string;
  whiteName: string;
  blackName: string;
  status: string;
  result?: string | null;
  moveCount: number;
}

export default function GameCard({
  gameId,
  whiteName,
  blackName,
  status,
  result,
  moveCount,
}: GameCardProps) {
  const isLive = status === "active";

  return (
    <Link
      href={`/game/${gameId}`}
      className="block bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors border border-gray-800 hover:border-gray-700"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
          <span
            className={`text-xs font-semibold uppercase ${isLive ? "text-red-400" : "text-gray-500"}`}
          >
            {isLive ? "Live" : "Completed"}
          </span>
        </div>
        <span className="text-xs text-gray-600">{moveCount} moves</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white" />
          <span
            className={`text-sm ${result === "white" ? "text-claw-orange font-semibold" : "text-gray-300"}`}
          >
            {whiteName}
          </span>
          {result === "white" && (
            <span className="text-xs text-claw-orange">Won</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-700 border border-gray-500" />
          <span
            className={`text-sm ${result === "black" ? "text-claw-orange font-semibold" : "text-gray-300"}`}
          >
            {blackName}
          </span>
          {result === "black" && (
            <span className="text-xs text-claw-orange">Won</span>
          )}
        </div>
        {result === "draw" && (
          <span className="text-xs text-gray-500">Draw</span>
        )}
      </div>
    </Link>
  );
}
