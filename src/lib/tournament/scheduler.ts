import {
  TOURNAMENT_DAY,
  TOURNAMENT_HOUR_CET,
  TOURNAMENT_DURATION_MINUTES,
} from "@/lib/constants";

/**
 * Calculate the next Monday at 17:00 CET/CEST.
 * Uses Europe/Berlin timezone to handle DST automatically.
 */
export function getNextMondayAt17CET(from: Date = new Date()): Date {
  // Format current time in Europe/Berlin to figure out local day/hour
  const berlinFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = berlinFormatter.formatToParts(from);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const berlinDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday")
  );
  const berlinHour = parseInt(get("hour"), 10);
  const berlinMinute = parseInt(get("minute"), 10);

  // How many days until next Monday (TOURNAMENT_DAY = 1)
  let daysUntil = (TOURNAMENT_DAY - berlinDay + 7) % 7;

  // If it's already Monday, check if the tournament time has passed
  if (daysUntil === 0) {
    const currentMinutes = berlinHour * 60 + berlinMinute;
    const targetMinutes = TOURNAMENT_HOUR_CET * 60;
    if (currentMinutes >= targetMinutes) {
      daysUntil = 7; // Next week
    }
  }

  // Build the target date by adding days to `from`, then setting the time
  // We need to find the UTC time that corresponds to Monday 17:00 in Europe/Berlin
  const target = new Date(from);
  target.setDate(target.getDate() + daysUntil);

  // Set to midnight UTC first, then we'll find the right offset
  // Create a date string for the target day in Berlin timezone
  const targetBerlin = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(target);

  const year = parseInt(
    targetBerlin.find((p) => p.type === "year")?.value ?? "0",
    10
  );
  const month = parseInt(
    targetBerlin.find((p) => p.type === "month")?.value ?? "0",
    10
  );
  const day = parseInt(
    targetBerlin.find((p) => p.type === "day")?.value ?? "0",
    10
  );

  // Try creating a UTC date and adjust for the Berlin offset
  // Start with a rough guess: CET is UTC+1, CEST is UTC+2
  const guess = new Date(
    Date.UTC(year, month - 1, day, TOURNAMENT_HOUR_CET - 1, 0, 0)
  );

  // Verify the guess is correct by checking what hour it is in Berlin
  const checkParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(guess);
  const checkHour = parseInt(
    checkParts.find((p) => p.type === "hour")?.value ?? "0",
    10
  );

  // Adjust if needed (handles CET vs CEST)
  const diff = TOURNAMENT_HOUR_CET - checkHour;
  if (diff !== 0) {
    guess.setUTCHours(guess.getUTCHours() - diff);
  }

  return guess;
}

/**
 * Check if a tournament is currently in its active window.
 */
export function isTournamentActive(tournament: {
  startsAt: Date;
  endsAt: Date;
}): boolean {
  const now = Date.now();
  return now >= tournament.startsAt.getTime() && now < tournament.endsAt.getTime();
}

/**
 * Check if a tournament should have started (transition from scheduled to active).
 */
export function shouldStartTournament(tournament: {
  startsAt: Date;
  status: string;
}): boolean {
  return tournament.status === "scheduled" && Date.now() >= tournament.startsAt.getTime();
}

/**
 * Check if a tournament should have ended (transition from active to completed).
 */
export function shouldEndTournament(tournament: {
  endsAt: Date;
  status: string;
}): boolean {
  return tournament.status === "active" && Date.now() >= tournament.endsAt.getTime();
}

/**
 * Get the tournament end time given a start time.
 */
export function getTournamentEndTime(startsAt: Date): Date {
  return new Date(startsAt.getTime() + TOURNAMENT_DURATION_MINUTES * 60 * 1000);
}

/**
 * Generate the tournament name using the count of existing tournaments.
 */
export function getTournamentName(existingCount: number): string {
  return `Molty Monday #${existingCount + 1}`;
}
