import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { moltys } from "@/lib/db/schema";
import { getMoltyByName, getActiveGameForMolty } from "@/lib/db/queries";
import { hashApiKey } from "@/lib/auth/api-key";
import { randomBytes } from "crypto";
import { like, eq, or } from "drizzle-orm";
import { games, moves as movesTable } from "@/lib/db/schema";

export const FAKE_USER_NAMES: string[] = [
  "SnapClaw",
  "LobsterMind",
  "ReefDweller",
  "TideHunter",
  "PinchyBot",
  "CoralCrusher",
  "ShellShock",
  "MoltyMcMolt",
  "DeepSeaGambit",
  "KelpKnight",
  "BarnacleKing",
  "CrabNebula",
  "SaltyClaw",
  "AbyssWalker",
  "TrenchThinker",
  "PrawnStar",
  "ClawdeMaster",
  "NauticalNerd",
  "OctoGambit",
  "MarianaThinker",
];

export function ensureFakeUsers(): void {
  // Clean up old bot users that are no longer in the current name pool
  const existingBots = db
    .select()
    .from(moltys)
    .where(like(moltys.id, "bot-%"))
    .all();

  const nameSet = new Set(FAKE_USER_NAMES);
  for (const bot of existingBots) {
    if (!nameSet.has(bot.name)) {
      // Delete related moves, games, then the bot itself
      const botGames = db
        .select({ id: games.id })
        .from(games)
        .where(or(eq(games.whiteId, bot.id), eq(games.blackId, bot.id)))
        .all();

      for (const g of botGames) {
        db.delete(movesTable).where(eq(movesTable.gameId, g.id)).run();
        db.delete(games).where(eq(games.id, g.id)).run();
      }

      db.delete(moltys).where(eq(moltys.id, bot.id)).run();
      console.log(`[Simulator] Removed old bot: ${bot.name}`);
    }
  }

  // Create any missing fake users
  for (const name of FAKE_USER_NAMES) {
    const existing = getMoltyByName(name);
    if (existing) continue;

    const id = `bot-${uuidv4()}`;
    const fakeHash = hashApiKey(`fake_${randomBytes(16).toString("hex")}`);
    const startingElo = 1000 + Math.floor(Math.random() * 400);

    db.insert(moltys)
      .values({
        id,
        name,
        bio: "A simulated player for demonstration purposes.",
        apiKeyHash: fakeHash,
        elo: startingElo,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        isActive: true,
      })
      .run();

    console.log(`[Simulator] Created fake user: ${name} (ELO ${startingElo})`);
  }
}

export function getAllFakeUsers() {
  return db
    .select()
    .from(moltys)
    .where(like(moltys.id, "bot-%"))
    .all();
}

export function getAvailableFakeUser(targetElo?: number) {
  const fakeUsers = getAllFakeUsers();
  const available = fakeUsers.filter((u) => !getActiveGameForMolty(u.id));
  if (available.length === 0) return null;

  if (targetElo !== undefined) {
    available.sort(
      (a, b) => Math.abs(a.elo - targetElo) - Math.abs(b.elo - targetElo)
    );
    return available[0];
  }

  return available[Math.floor(Math.random() * available.length)];
}

export function getRandomFakeUserPair() {
  const fakeUsers = getAllFakeUsers();
  const available = fakeUsers.filter((u) => !getActiveGameForMolty(u.id));
  if (available.length < 2) return null;

  // Shuffle and pick two distinct users
  const shuffled = available.sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]] as const;
}
