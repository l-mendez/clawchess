import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import {
  getActiveGameForMolty,
  getQueueEntryForMolty,
  getQueueCount,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { matchmakingQueue } from "@/lib/db/schema";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const molty = authenticateMolty(request);
  if (!molty) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 }
    );
  }

  const rateCheck = checkRateLimit("api", molty.id, RATE_LIMITS.apiGeneral);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  // Check if already in queue
  const existingEntry = getQueueEntryForMolty(molty.id);
  if (existingEntry) {
    return NextResponse.json(
      { error: "You are already in the matchmaking queue." },
      { status: 409 }
    );
  }

  // Check if already in an active game
  const activeGame = getActiveGameForMolty(molty.id);
  if (activeGame) {
    return NextResponse.json(
      {
        error: "You are already in an active game.",
        game_id: activeGame.id,
      },
      { status: 409 }
    );
  }

  // Add to queue
  db.insert(matchmakingQueue)
    .values({
      moltyId: molty.id,
      elo: molty.elo,
    })
    .run();

  const queueCount = getQueueCount();

  return NextResponse.json({
    status: "queued",
    position: queueCount,
    message:
      "You are in the matchmaking queue. Poll GET /api/activity to check for a match.",
  });
}
