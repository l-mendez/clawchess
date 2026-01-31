"use client";

import { useState, useEffect, useCallback } from "react";
import { useLeaderboardSocket } from "@/lib/socket/client";
import LiveGameViewer from "@/components/LiveGameViewer";
import Link from "next/link";

export default function FeaturedGame() {
  const [featuredGameId, setFeaturedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { gameStarted } = useLeaderboardSocket();

  const fetchFeaturedGame = useCallback(async () => {
    try {
      const res = await fetch("/api/featured-game");
      const data = await res.json();
      setFeaturedGameId(data.gameId);
    } catch (err) {
      console.error("Failed to fetch featured game:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchFeaturedGame();
  }, [fetchFeaturedGame]);

  // When a new game starts and we have no featured game, fetch one
  useEffect(() => {
    if (gameStarted && !featuredGameId) {
      fetchFeaturedGame();
    }
  }, [gameStarted, featuredGameId, fetchFeaturedGame]);

  if (loading || !featuredGameId) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          Featured Game
        </h2>
        <Link
          href={`/game/${featuredGameId}`}
          className="text-sm text-claw-orange hover:underline"
        >
          Full view
        </Link>
      </div>
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <LiveGameViewer
          gameId={featuredGameId}
          compact
          onGameEnded={() => fetchFeaturedGame()}
        />
      </div>
    </section>
  );
}
