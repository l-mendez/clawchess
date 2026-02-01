/**
 * Standalone proof that the matchmaking algorithm works.
 * Extracts the pure findMatch logic and tests it against many scenarios.
 *
 * Run: node test-matchmaking.mjs
 */

// ── Replicate constants from src/lib/constants.ts ──
const MATCHMAKING_ELO_WINDOWS = [
  { waitSeconds: 0, range: 100 },
  { waitSeconds: 30, range: 200 },
  { waitSeconds: 60, range: 400 },
  { waitSeconds: 120, range: Infinity },
];

// ── Replicate findMatch from src/lib/matchmaking/queue.ts ──
function findMatch(entries, nowOverride) {
  const now = nowOverride ?? Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const waitSeconds = (now - entry.joinedAt.getTime()) / 1000;

    let maxRange = 100;
    for (const window of MATCHMAKING_ELO_WINDOWS) {
      if (waitSeconds >= window.waitSeconds) {
        maxRange = window.range;
      }
    }

    let bestMatchIdx = -1;
    let bestEloDiff = Infinity;

    for (let j = i + 1; j < entries.length; j++) {
      const candidate = entries[j];
      const eloDiff = Math.abs(entry.elo - candidate.elo);

      if (eloDiff <= maxRange && eloDiff < bestEloDiff) {
        bestEloDiff = eloDiff;
        bestMatchIdx = j;
      }
    }

    if (bestMatchIdx === -1) {
      for (let j = i + 1; j < entries.length; j++) {
        const candidate = entries[j];
        const candidateWait = (now - candidate.joinedAt.getTime()) / 1000;
        let candidateRange = 100;
        for (const window of MATCHMAKING_ELO_WINDOWS) {
          if (candidateWait >= window.waitSeconds) {
            candidateRange = window.range;
          }
        }

        const eloDiff = Math.abs(entry.elo - candidate.elo);
        if (eloDiff <= candidateRange && eloDiff < bestEloDiff) {
          bestEloDiff = eloDiff;
          bestMatchIdx = j;
        }
      }
    }

    if (bestMatchIdx !== -1) {
      return [i, bestMatchIdx];
    }
  }

  return null;
}

// ── Replicate runMatchmaking loop logic ──
function runMatchmaking(entries, nowOverride) {
  if (entries.length < 2) return [];

  const matches = [];
  const remaining = [...entries];

  while (remaining.length >= 2) {
    const pair = findMatch(remaining, nowOverride);
    if (!pair) break;

    const [i, j] = pair;
    matches.push({
      player1: remaining[i].moltyId,
      elo1: remaining[i].elo,
      player2: remaining[j].moltyId,
      elo2: remaining[j].elo,
      eloDiff: Math.abs(remaining[i].elo - remaining[j].elo),
    });

    remaining.splice(j, 1);
    remaining.splice(i, 1);
  }

  return matches;
}

// ── Helpers ──
function makeEntry(id, elo, waitSeconds = 0, now = Date.now()) {
  return {
    id: parseInt(id),
    moltyId: `player-${id}`,
    elo,
    joinedAt: new Date(now - waitSeconds * 1000),
  };
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${label}`);
  }
}

// ──────────────────────────────────────────────────
// TEST SUITE
// ──────────────────────────────────────────────────

console.log("\n══════════════════════════════════════════════");
console.log("  MATCHMAKING ALGORITHM PROOF");
console.log("══════════════════════════════════════════════\n");

// ── Test 1: Basic ELO matching ──
console.log("Test 1: Two close-ELO players match immediately");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 0, now),
    makeEntry("2", 1250, 0, now),
  ];
  const result = findMatch(entries, now);
  assert(result !== null, "Players with 50 ELO diff should match");
  assert(result[0] === 0 && result[1] === 1, "Returns correct indices [0, 1]");
}

// ── Test 2: Too far apart, no match at 0 wait ──
console.log("\nTest 2: Two far-apart players do NOT match at 0 wait");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1000, 0, now),
    makeEntry("2", 1500, 0, now),
  ];
  const result = findMatch(entries, now);
  assert(result === null, "500 ELO diff should not match with 0 wait (range ±100)");
}

// ── Test 3: Range expands after 30s ──
console.log("\nTest 3: ELO range widens to ±200 after 30 seconds");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 35, now), // waiting 35s → range ±200
    makeEntry("2", 1390, 0, now),  // just joined
  ];
  const result = findMatch(entries, now);
  assert(result !== null, "190 ELO diff matches when first player waited 35s (range ±200)");
}

// ── Test 4: Range expands after 60s ──
console.log("\nTest 4: ELO range widens to ±400 after 60 seconds");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 65, now), // waiting 65s → range ±400
    makeEntry("2", 1550, 0, now),
  ];
  const result = findMatch(entries, now);
  assert(result !== null, "350 ELO diff matches when first player waited 65s (range ±400)");
}

// ── Test 5: Range infinite after 120s ──
console.log("\nTest 5: After 120 seconds, anyone matches anyone");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 800, 125, now),  // waiting 125s → range ∞
    makeEntry("2", 2400, 0, now),
  ];
  const result = findMatch(entries, now);
  assert(result !== null, "1600 ELO diff matches after 120s wait (range ∞)");
}

// ── Test 6: Candidate's wait time can enable match ──
console.log("\nTest 6: Candidate's own wait time can enable a match");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 5, now),   // waiting 5s → range ±100
    makeEntry("2", 1350, 40, now),  // waiting 40s → range ±200
  ];
  // Player 1's range is ±100, so 150 diff doesn't fit.
  // But player 2 has range ±200, so the fallback logic matches them.
  const result = findMatch(entries, now);
  assert(result !== null, "Candidate's wider range (±200) allows the match");
}

// ── Test 7: Best ELO match is selected ──
console.log("\nTest 7: Closest ELO match is preferred among eligible candidates");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 0, now),
    makeEntry("2", 1280, 0, now),   // 80 diff
    makeEntry("3", 1210, 0, now),   // 10 diff ← best
    makeEntry("4", 1250, 0, now),   // 50 diff
  ];
  const result = findMatch(entries, now);
  assert(result !== null, "Match found");
  assert(result[0] === 0 && result[1] === 2, "Picks player 3 (closest at 10 ELO diff) not player 2 or 4");
}

// ── Test 8: Multiple pairs in one round ──
console.log("\nTest 8: Multiple pairs created in a single matchmaking round");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 0, now),
    makeEntry("2", 1210, 0, now),
    makeEntry("3", 1500, 0, now),
    makeEntry("4", 1520, 0, now),
  ];
  const matches = runMatchmaking(entries, now);
  assert(matches.length === 2, `Two matches created (got ${matches.length})`);
  assert(
    matches.some(m => m.eloDiff <= 100) && matches.every(m => m.eloDiff <= 100),
    "Both matches are within ±100 ELO"
  );
}

// ── Test 9: Odd number of players — one left unmatched ──
console.log("\nTest 9: Odd player count — leftover player stays in queue");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 0, now),
    makeEntry("2", 1215, 0, now),
    makeEntry("3", 1800, 0, now), // far from the pair, 0 wait
  ];
  const matches = runMatchmaking(entries, now);
  assert(matches.length === 1, `One match created, one player left over (got ${matches.length})`);
  assert(
    matches[0].player1 === "player-1" && matches[0].player2 === "player-2",
    "The close pair matched, not the outlier"
  );
}

// ── Test 10: Empty / single player queue ──
console.log("\nTest 10: Edge cases — empty and single-player queues");
{
  const now = Date.now();
  const matchesEmpty = runMatchmaking([], now);
  assert(matchesEmpty.length === 0, "Empty queue returns no matches");

  const matchesSingle = runMatchmaking([makeEntry("1", 1200, 0, now)], now);
  assert(matchesSingle.length === 0, "Single player returns no matches");
}

// ── Test 11: FIFO ordering — earlier players matched first ──
console.log("\nTest 11: FIFO — earlier-queued player gets priority");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 10, now), // joined 10s ago
    makeEntry("2", 1210, 5, now),  // joined 5s ago
    makeEntry("3", 1205, 0, now),  // just joined
  ];
  // Player 1 is first in queue. Both 2 (diff=10) and 3 (diff=5) are valid.
  // Algorithm picks best ELO match for player 1, which is player 3 (diff=5).
  const result = findMatch(entries, now);
  assert(result !== null, "Match found");
  assert(result[0] === 0, "First-in-queue player (idx 0) is always checked first");
}

// ── Test 12: Exactly at boundary ──
console.log("\nTest 12: Boundary — exactly at ±100 ELO is a match");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 0, now),
    makeEntry("2", 1300, 0, now), // exactly 100 diff
  ];
  const result = findMatch(entries, now);
  assert(result !== null, "Exactly 100 ELO diff matches (<=100 check)");
}

// ── Test 13: Just over boundary ──
console.log("\nTest 13: Boundary — 101 ELO diff does NOT match at 0 wait");
{
  const now = Date.now();
  const entries = [
    makeEntry("1", 1200, 0, now),
    makeEntry("2", 1301, 0, now), // 101 diff
  ];
  const result = findMatch(entries, now);
  assert(result === null, "101 ELO diff does not match at range ±100");
}

// ── Test 14: Large queue stress test ──
console.log("\nTest 14: Large queue — 100 players matched efficiently");
{
  const now = Date.now();
  const entries = [];
  for (let i = 0; i < 100; i++) {
    // ELOs from 1000 to 1099, all within ±100
    entries.push(makeEntry(String(i), 1000 + i, 0, now));
  }
  const matches = runMatchmaking(entries, now);
  assert(matches.length === 50, `All 100 players paired into 50 matches (got ${matches.length})`);
  assert(
    matches.every(m => m.eloDiff <= 100),
    "All matches within ±100 ELO range"
  );
}

// ── Test 15: Progressive widening over time ──
console.log("\nTest 15: Same pair — match only happens once wait is long enough");
{
  const now = Date.now();
  const p1Elo = 1200;
  const p2Elo = 1350; // 150 diff

  // At 0s wait: range ±100 → no match
  let entries = [makeEntry("1", p1Elo, 0, now), makeEntry("2", p2Elo, 0, now)];
  assert(findMatch(entries, now) === null, "At 0s: 150 diff > ±100 → no match");

  // At 25s wait: still ±100 → no match
  entries = [makeEntry("1", p1Elo, 25, now), makeEntry("2", p2Elo, 25, now)];
  assert(findMatch(entries, now) === null, "At 25s: 150 diff > ±100 → no match");

  // At 35s wait: ±200 → match!
  entries = [makeEntry("1", p1Elo, 35, now), makeEntry("2", p2Elo, 35, now)];
  assert(findMatch(entries, now) !== null, "At 35s: 150 diff ≤ ±200 → match!");
}

// ── Summary ──
console.log("\n══════════════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log("══════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
