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

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
