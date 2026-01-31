"use client";

import { useRef, useEffect } from "react";

interface MoveHistoryProps {
  moves: Array<{ san: string; color: string; moveNumber: number }>;
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Group moves into pairs (white + black per row)
  const rows: Array<{
    number: number;
    white?: string;
    black?: string;
  }> = [];

  for (const move of moves) {
    if (move.color === "w") {
      rows.push({
        number: Math.floor((rows.length) + 1),
        white: move.san,
      });
    } else {
      if (rows.length > 0 && !rows[rows.length - 1].black) {
        rows[rows.length - 1].black = move.san;
      } else {
        rows.push({
          number: rows.length + 1,
          black: move.san,
        });
      }
    }
  }

  if (moves.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">Waiting for first move...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Moves
      </div>
      <div ref={scrollRef} className="overflow-y-auto flex-1 px-2 py-1">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center text-sm py-0.5 ${
              i === rows.length - 1 ? "bg-claw-dark/50 rounded" : ""
            }`}
          >
            <span className="w-8 text-right text-gray-600 text-xs mr-2">
              {row.number}.
            </span>
            <span className="w-20 text-white font-mono">
              {row.white || ""}
            </span>
            <span className="w-20 text-gray-300 font-mono">
              {row.black || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
