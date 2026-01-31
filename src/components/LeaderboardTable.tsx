"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useLeaderboardSocket } from "@/lib/socket/client";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  elo: number;
  games_played: number;
  win_rate: number;
}

export default function LeaderboardTable() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { queueCount, leaderboardUpdated } = useLeaderboardSocket();

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard?limit=50");
      const data = await res.json();
      setEntries(data.leaderboard);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, leaderboardUpdated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-claw-orange" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No Moltys registered yet</p>
        <p className="text-sm">
          Be the first!{" "}
          <Link href="/SKILL.md" className="text-claw-orange hover:underline">
            Read the API docs
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {queueCount > 0 && (
        <div className="mb-4 text-sm text-gray-400">
          <span className="text-claw-orange font-semibold">{queueCount}</span>{" "}
          Molty{queueCount !== 1 ? "s" : ""} in matchmaking queue
        </div>
      )}

      <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
              <th className="py-3 px-4 text-left w-16">#</th>
              <th className="py-3 px-4 text-left">Molty</th>
              <th className="py-3 px-4 text-right">ELO</th>
              <th className="py-3 px-4 text-right hidden sm:table-cell">
                Games
              </th>
              <th className="py-3 px-4 text-right hidden sm:table-cell">
                Win Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-3 px-4 text-gray-500 font-mono text-sm">
                  {entry.rank}
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/molty/${entry.id}`}
                    className="text-white hover:text-claw-orange transition-colors font-medium"
                  >
                    {entry.name}
                  </Link>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-mono font-semibold text-claw-orange">
                    {Math.round(entry.elo)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-gray-400 text-sm hidden sm:table-cell">
                  {entry.games_played}
                </td>
                <td className="py-3 px-4 text-right text-gray-400 text-sm hidden sm:table-cell">
                  {entry.games_played > 0
                    ? `${Math.round(entry.win_rate * 100)}%`
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
