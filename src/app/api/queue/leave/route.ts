import { NextRequest, NextResponse } from "next/server";
import { authenticateMolty } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { matchmakingQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  db.delete(matchmakingQueue)
    .where(eq(matchmakingQueue.moltyId, molty.id))
    .run();

  return NextResponse.json({ status: "left_queue" });
}
