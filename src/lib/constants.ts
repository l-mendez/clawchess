// ELO
export const DEFAULT_ELO = 1200;
export const K_FACTOR_NEW = 40; // First 30 games
export const K_FACTOR_NORMAL = 20; // After 30 games
export const K_FACTOR_MASTER = 10; // Above 2400 ELO
export const NEW_PLAYER_THRESHOLD = 30;
export const MASTER_ELO_THRESHOLD = 2400;

// Time control (5+0 Blitz)
export const DEFAULT_TIME_CONTROL_SECONDS = 300; // 5 minutes
export const DEFAULT_INCREMENT_SECONDS = 0;

// Matchmaking
export const MATCHMAKING_INTERVAL_MS = 5000; // Run every 5 seconds
export const MATCHMAKING_ELO_WINDOWS = [
  { waitSeconds: 0, range: 100 },
  { waitSeconds: 30, range: 200 },
  { waitSeconds: 60, range: 400 },
  { waitSeconds: 120, range: Infinity },
];

// Bot fallback matchmaking
export const BOT_FALLBACK_WAIT_SECONDS = 60;
export const BOT_MOVE_MIN_DELAY_MS = 2000;
export const BOT_MOVE_MAX_DELAY_MS = 8000;
export const BOT_OPENING_BOOK_DEPTH = 10; // half-moves before going random

// Rate limiting
export const RATE_LIMITS = {
  register: { windowMs: 3600000, maxRequests: 3 }, // 3/hour per IP
  apiGeneral: { windowMs: 60000, maxRequests: 60 }, // 60/min per API key
  moveEndpoint: { windowMs: 1000, maxRequests: 5 }, // 5/sec per API key
  publicEndpoints: { windowMs: 60000, maxRequests: 30 }, // 30/min per IP
} as const;

// WebSocket
export const MAX_WS_CONNECTIONS_PER_IP = 100;
export const WS_HEARTBEAT_TIMEOUT_MS = 60000;

// API key prefix
export const API_KEY_PREFIX = "clw_live_";

// Simulator
export const SIMULATOR_ENABLED = true; // Set to false to disable fake games
export const SIMULATOR_CHECK_INTERVAL_MS = 10000;
// Target number of live games fluctuates between these, re-rolled periodically
export const SIMULATOR_MIN_LIVE_GAMES = 1;
export const SIMULATOR_MAX_LIVE_GAMES = 3;
export const SIMULATOR_TARGET_REROLL_MS = 10 * 60 * 1000;
// Think times: quick in the opening, slower in the middlegame, occasional long think
export const SIMULATOR_OPENING_PLIES = 12;
export const SIMULATOR_OPENING_MOVE_DELAY_MS = { min: 500, max: 2500 };
export const SIMULATOR_MOVE_DELAY_MS = { min: 2000, max: 9000 };
export const SIMULATOR_LONG_THINK_CHANCE = 0.08;
export const SIMULATOR_LONG_THINK_DELAY_MS = { min: 12000, max: 25000 };
// Never spend more than this fraction of the remaining clock on one move
export const SIMULATOR_MAX_CLOCK_FRACTION = 0.08;
// Bots rest between games instead of instantly starting another
export const SIMULATOR_BOT_REST_MS = { min: 5 * 60 * 1000, max: 30 * 60 * 1000 };
// Only keep the most recent bot-vs-bot games; older ones are pruned with their moves
export const SIMULATOR_MAX_STORED_GAMES = 500;
export const SIMULATOR_PRUNE_INTERVAL_MS = 60 * 1000;
export const SIMULATOR_PRUNE_BATCH_SIZE = 100;

// Tournament (Molty Mondays)
export const TOURNAMENT_DAY = 1; // Monday (0=Sunday)
export const TOURNAMENT_HOUR_CET = 17; // 17:00 CET
export const TOURNAMENT_DURATION_MINUTES = 120; // 2 hours
export const TOURNAMENT_PAIRING_INTERVAL_MS = 5000; // Pair every 5s
export const TOURNAMENT_RECENT_OPPONENT_COOLDOWN_MS = 120000; // 2 min
export const TOURNAMENT_LIFECYCLE_CHECK_MS = 30000; // Check lifecycle every 30s
export const TOURNAMENT_BANNER_SHOW_HOURS_BEFORE = 24;
export const TOURNAMENT_BANNER_SHOW_HOURS_AFTER = 1;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
