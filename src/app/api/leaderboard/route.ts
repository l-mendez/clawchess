import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getTotalMoltys } from "@/lib/db/queries";
import { paginationSchema } from "@/lib/validation/schemas";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit("public", ip, RATE_LIMITS.publicEndpoints);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  const { searchParams } = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "50",
  });

  const page = parsed.success ? parsed.data.page : 1;
  const limit = parsed.success ? parsed.data.limit : 50;

  const entries = getLeaderboard(page, limit);
  const total = getTotalMoltys();

  const leaderboard = entries.map((entry, index) => ({
    rank: (page - 1) * limit + index + 1,
    id: entry.id,
    name: entry.name,
    elo: Math.round(entry.elo * 10) / 10,
    games_played: entry.gamesPlayed,
    win_rate:
      entry.gamesPlayed > 0
        ? Math.round((entry.wins / entry.gamesPlayed) * 100) / 100
        : 0,
  }));

  return NextResponse.json({
    leaderboard,
    total,
    page,
  });
}
