import { NextRequest, NextResponse } from "next/server";
import { getActiveGameForMolty, getMoltyById } from "@/lib/db/queries";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ moltyId: string }> }
) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit("public", ip, RATE_LIMITS.publicEndpoints);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  const { moltyId } = await params;
  const molty = getMoltyById(moltyId);
  if (!molty) {
    return NextResponse.json({ error: "Molty not found" }, { status: 404 });
  }

  const activeGame = getActiveGameForMolty(moltyId);

  return NextResponse.json({
    gameId: activeGame?.id ?? null,
    color: activeGame
      ? activeGame.whiteId === moltyId
        ? "white"
        : "black"
      : null,
    name: molty.name,
  });
}
