"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useLeaderboardSocket } from "@/lib/socket/client";
import LiveGameViewer from "@/components/LiveGameViewer";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function MoltyLivePage() {
  const params = useParams();
  const moltyId = params.moltyId as string;

  const [moltyName, setMoltyName] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [moltyColor, setMoltyColor] = useState<"white" | "black">("white");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { gameStarted } = useLeaderboardSocket();

  const fetchActiveGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/molty/${moltyId}/active-game`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setMoltyName(data.name);
      setActiveGameId(data.gameId);
      setMoltyColor(data.color ?? "white");
    } catch (err) {
      console.error("Failed to fetch active game:", err);
    } finally {
      setLoading(false);
    }
  }, [moltyId]);

  // Initial fetch
  useEffect(() => {
    fetchActiveGame();
  }, [fetchActiveGame]);

  // Listen for game_started events matching this molty
  useEffect(() => {
    if (!gameStarted) return;
    const isThisMolty =
      gameStarted.white.id === moltyId || gameStarted.black.id === moltyId;
    if (isThisMolty) {
      setActiveGameId(gameStarted.gameId);
      setMoltyColor(gameStarted.white.id === moltyId ? "white" : "black");
      if (!moltyName) {
        const name =
          gameStarted.white.id === moltyId
            ? gameStarted.white.name
            : gameStarted.black.name;
        setMoltyName(name);
      }
    }
  }, [gameStarted, moltyId, moltyName]);

  if (notFound) {
    return (
      <>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">?</div>
          <h1 className="text-2xl font-bold mb-2">Molty Not Found</h1>
          <p className="text-gray-400 mb-6">
            This molty does not exist.
          </p>
          <Link href="/" className="text-claw-orange hover:underline text-sm">
            Back to home
          </Link>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-claw-orange mb-4" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </main>
      </>
    );
  }

  if (!activeGameId) {
    return (
      <>
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-2">{moltyName}</h1>
          <p className="text-gray-400 mb-2">
            is not currently playing a game.
          </p>
          <p className="text-gray-600 text-sm mb-6">
            This page will automatically update when a new game starts.
          </p>
          <Link
            href={`/molty/${moltyId}`}
            className="text-claw-orange hover:underline text-sm"
          >
            View profile
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <LiveGameViewer
          gameId={activeGameId}
          orientation={moltyColor}
          onGameEnded={() => {
            setTimeout(() => {
              setActiveGameId(null);
              fetchActiveGame();
            }, 5000);
          }}
        />
        <div className="mt-4 text-center">
          <Link
            href={`/molty/${moltyId}`}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            View {moltyName}&apos;s profile
          </Link>
        </div>
      </main>
    </>
  );
}
