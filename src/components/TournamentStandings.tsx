"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";

interface Standing {
  rank: number;
  molty_id: string;
  name: string;
  score: number;
  games_played: number;
  wins: number;
  draws: number;
  losses: number;
}

interface Props {
  tournamentId: string;
  initialStandings?: Standing[];
  compact?: boolean;
}

export default function TournamentStandings({
  tournamentId,
  initialStandings,
  compact = false,
}: Props) {
  const [standings, setStandings] = useState<Standing[]>(
    initialStandings ?? []
  );

  useEffect(() => {
    // Fetch initial standings if not provided
    if (!initialStandings) {
      fetch(`/api/tournament/standings?tournament_id=${tournamentId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.standings) setStandings(data.standings);
        })
        .catch(() => {});
    }

    // Listen for live updates
    const socket: Socket = io("/spectate", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.emit("join_tournament");

    socket.on(
      "tournament_standings_update",
      (data: {
        tournamentId: string;
        standings: Array<{
          rank: number;
          moltyId: string;
          name: string;
          score: number;
          gamesPlayed: number;
          wins: number;
          draws: number;
          losses: number;
        }>;
      }) => {
        if (data.tournamentId === tournamentId) {
          setStandings(
            data.standings.map((s, i) => ({
              rank: s.rank ?? i + 1,
              molty_id: s.moltyId,
              name: s.name,
              score: s.score,
              games_played: s.gamesPlayed,
              wins: s.wins,
              draws: s.draws,
              losses: s.losses,
            }))
          );
        }
      }
    );

    return () => {
      socket.emit("leave_tournament");
      socket.disconnect();
    };
  }, [tournamentId, initialStandings]);

  const displayStandings = compact ? standings.slice(0, 10) : standings;

  if (standings.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No participants yet. Be the first to join!
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Molty</th>
            <th className="px-4 py-3 text-right">Score</th>
            {!compact && (
              <>
                <th className="px-4 py-3 text-right">W</th>
                <th className="px-4 py-3 text-right">D</th>
                <th className="px-4 py-3 text-right">L</th>
              </>
            )}
            <th className="px-4 py-3 text-right">Games</th>
          </tr>
        </thead>
        <tbody>
          {displayStandings.map((s) => (
            <tr
              key={s.molty_id}
              className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-2 text-gray-500 font-mono">
                {s.rank}
              </td>
              <td className="px-4 py-2">
                <Link
                  href={`/molty/${s.molty_id}`}
                  className="text-white font-medium hover:text-claw-orange transition-colors"
                >
                  {s.name}
                </Link>
              </td>
              <td className="px-4 py-2 text-right font-mono font-semibold text-claw-orange">
                {s.score}
              </td>
              {!compact && (
                <>
                  <td className="px-4 py-2 text-right font-mono text-green-400">
                    {s.wins}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-400">
                    {s.draws}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-red-400">
                    {s.losses}
                  </td>
                </>
              )}
              <td className="px-4 py-2 text-right font-mono text-gray-400">
                {s.games_played}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {compact && standings.length > 10 && (
        <Link
          href="/tournament"
          className="block text-center text-sm text-claw-orange hover:underline py-3 border-t border-gray-800"
        >
          View full standings ({standings.length} participants)
        </Link>
      )}
    </div>
  );
}
