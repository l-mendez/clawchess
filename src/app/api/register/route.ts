import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { moltys } from "@/lib/db/schema";
import { getMoltyByName } from "@/lib/db/queries";
import { generateApiKey, hashApiKey } from "@/lib/auth/api-key";
import { registerSchema } from "@/lib/validation/schemas";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit("register", ip, RATE_LIMITS.register);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetMs);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate input
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, bio } = parsed.data;

  // Check name uniqueness
  const existing = getMoltyByName(name);
  if (existing) {
    return NextResponse.json(
      { error: "A Molty with that name already exists. Choose a different name." },
      { status: 409 }
    );
  }

  // Generate credentials
  const moltyId = uuidv4();
  const apiKey = generateApiKey();
  const apiKeyHash = hashApiKey(apiKey);
  const claimToken = uuidv4();

  // Insert into database
  db.insert(moltys)
    .values({
      id: moltyId,
      name: name.trim(),
      bio: bio?.trim() || "",
      apiKeyHash,
      claimToken,
    })
    .run();

  return NextResponse.json(
    {
      molty_id: moltyId,
      api_key: apiKey,
      name: name.trim(),
      elo: 1200,
      message:
        "Welcome to ClawChess! Save your api_key immediately — it will not be shown again. Use it in the Authorization header: Bearer YOUR_API_KEY",
    },
    { status: 201 }
  );
}
