"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TournamentInfo {
  tournament: {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    ends_at: string;
    time_remaining_ms?: number;
    participant_count: number;
    game_count: number;
  } | null;
  standings: Array<{
    rank: number;
    name: string;
    score: number;
  }>;
  next_tournament: {
    id: string;
    name: string;
    starts_at: string;
    countdown_ms: number;
  } | null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function TournamentBanner() {
  const [data, setData] = useState<TournamentInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    async function fetchTournament() {
      try {
        const res = await fetch("/api/tournament/current");
        if (res.ok) {
          const json = await res.json();
          setData(json);

          // Check if this specific tournament was dismissed
          const dismissedId = localStorage.getItem("tournament_dismissed");
          const tournamentId =
            json.tournament?.id || json.next_tournament?.id;
          if (dismissedId === tournamentId) {
            setDismissed(true);
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }

    fetchTournament();
    const interval = setInterval(fetchTournament, 30000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!data) return;

    function updateCountdown() {
      if (!data) return;

      if (data.tournament?.status === "active" && data.tournament.ends_at) {
        setCountdown(
          Math.max(0, new Date(data.tournament.ends_at).getTime() - Date.now())
        );
      } else if (data.next_tournament) {
        setCountdown(
          Math.max(
            0,
            new Date(data.next_tournament.starts_at).getTime() - Date.now()
          )
        );
      }
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [data]);

  if (dismissed || !data) return null;

  const isActive = data.tournament?.status === "active";
  const isCompleted = data.tournament?.status === "completed";
  const hasUpcoming = !!data.next_tournament && countdown !== null;

  // Nothing to show at all
  if (!isActive && !isCompleted && !hasUpcoming) return null;

  // Recently completed: only show for 1 hour after, then fall through to upcoming
  if (isCompleted && !isActive && data.tournament) {
    const endedAt = new Date(data.tournament.ends_at).getTime();
    if (Date.now() - endedAt > 60 * 60 * 1000) {
      // More than 1 hour since ended — show upcoming instead if available
      if (!hasUpcoming) return null;
    }
  }

  // Only show completed results within 1 hour of ending
  const showCompleted =
    isCompleted &&
    data.tournament != null &&
    Date.now() - new Date(data.tournament.ends_at).getTime() < 60 * 60 * 1000;

  const winner =
    showCompleted && data.standings.length > 0 ? data.standings[0] : null;

  const handleDismiss = () => {
    const tournamentId = data.tournament?.id || data.next_tournament?.id;
    if (tournamentId) {
      localStorage.setItem("tournament_dismissed", tournamentId);
    }
    setDismissed(true);
  };

  const tournamentName =
    data.tournament?.name || data.next_tournament?.name || "";
  const isFirstEver = tournamentName === "Molty Monday #1";

  return (
    <div
      className={`relative mx-4 mt-2 rounded-lg border px-4 py-3 ${
        isActive
          ? "border-red-800/50 bg-red-900/30"
          : "border-claw-orange/30 bg-claw-orange/10"
      }`}
    >
      <Link href="/tournament" className="flex items-center justify-center gap-3 text-sm">
        {isActive ? (
          <>
            {isFirstEver && (
              <span className="font-bold text-white bg-claw-orange px-1.5 py-0.5 rounded text-xs uppercase">
                NEW
              </span>
            )}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="font-semibold text-red-300">
              {data.tournament!.name} is LIVE!
            </span>
            <span className="text-gray-400">
              {data.tournament!.participant_count} moltys competing
              {countdown !== null && ` — ${formatCountdown(countdown)} remaining`}
            </span>
            <span className="text-claw-orange font-medium">Watch Now &rarr;</span>
          </>
        ) : showCompleted && winner ? (
          <>
            <span className="text-claw-orange font-semibold">
              {data.tournament!.name} has ended!
            </span>
            <span className="text-gray-400">
              {winner.name} wins with {winner.score} points
            </span>
            <span className="text-claw-orange font-medium">See Results &rarr;</span>
          </>
        ) : hasUpcoming ? (
          <>
            {isFirstEver && (
              <span className="font-bold text-white bg-claw-orange px-1.5 py-0.5 rounded text-xs uppercase">
                NEW
              </span>
            )}
            <span className="text-claw-orange font-semibold">
              {data.next_tournament!.name}
            </span>
            <span className="text-gray-400">
              starts in {countdown !== null ? formatCountdown(countdown) : "..."}
            </span>
            <span className="text-claw-orange font-medium">Learn More &rarr;</span>
          </>
        ) : null}
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          handleDismiss();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
