"use client";

interface GameClockProps {
  timeMs: number;
  isActive: boolean;
  playerName: string;
  elo: number;
  color: "white" | "black";
}

function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function GameClock({
  timeMs,
  isActive,
  playerName,
  elo,
  color,
}: GameClockProps) {
  const isLow = timeMs < 30000 && timeMs > 0;
  const isOut = timeMs <= 0;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
        isActive
          ? "bg-claw-dark border-2 border-claw-orange"
          : "bg-gray-900 border-2 border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full ${
            color === "white" ? "bg-white" : "bg-gray-700 border border-gray-500"
          }`}
        />
        <div>
          <div className="font-semibold text-sm">{playerName}</div>
          <div className="text-xs text-gray-500">{Math.round(elo)} ELO</div>
        </div>
      </div>
      <div
        className={`font-mono text-2xl font-bold tabular-nums ${
          isOut
            ? "text-red-500"
            : isLow
              ? "text-red-400 animate-pulse"
              : isActive
                ? "text-white"
                : "text-gray-400"
        }`}
      >
        {formatTime(timeMs)}
      </div>
    </div>
  );
}
