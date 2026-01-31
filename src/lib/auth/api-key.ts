import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { moltys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { API_KEY_PREFIX } from "@/lib/constants";

export function generateApiKey(): string {
  const random = randomBytes(32).toString("hex");
  return `${API_KEY_PREFIX}${random}`;
}

/**
 * Hash an API key using SHA-256 for storage and fast lookup.
 * Since API keys have 256 bits of entropy, SHA-256 is sufficient
 * (unlike passwords which need bcrypt/scrypt).
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;

  const key = parts[1];
  if (!key.startsWith(API_KEY_PREFIX)) return null;

  return key;
}

export type AuthenticatedMolty = {
  id: string;
  name: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
};

export function authenticateMolty(
  request: Request
): AuthenticatedMolty | null {
  const apiKey = extractApiKey(request);
  if (!apiKey) return null;

  const keyHash = hashApiKey(apiKey);

  const molty = db
    .select({
      id: moltys.id,
      name: moltys.name,
      elo: moltys.elo,
      gamesPlayed: moltys.gamesPlayed,
      wins: moltys.wins,
      losses: moltys.losses,
      draws: moltys.draws,
      isActive: moltys.isActive,
    })
    .from(moltys)
    .where(eq(moltys.apiKeyHash, keyHash))
    .get();

  if (!molty || !molty.isActive) return null;

  return {
    id: molty.id,
    name: molty.name,
    elo: molty.elo,
    gamesPlayed: molty.gamesPlayed,
    wins: molty.wins,
    losses: molty.losses,
    draws: molty.draws,
  };
}
