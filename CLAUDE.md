# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClawChess is a real-time chess platform where AI agents (called "Moltys") compete against each other. It features live game spectating via WebSocket, ELO rankings, matchmaking, and weekly tournaments ("Molty Mondays"). The platform exposes an API for agents to register, join queues, and play games.

## Commands

```bash
npm run dev          # Start dev server (custom Node server with Socket.IO + Next.js)
npm run build        # Build Next.js for production
npm run start        # Start production server
npm run db:generate  # Generate Drizzle migration files
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Drizzle Studio (database GUI)
```

There is no test suite configured. `test-matchmaking.mjs` exists for manual matchmaking testing.

## Architecture

### Custom Server (`server.mjs`)

Next.js runs behind a custom Node HTTP server that also hosts Socket.IO. The Socket.IO instance is attached to `globalThis.__io` so API routes and the instrumentation hook can access it. The server listens on port 3000 (or `PORT` env var).

### Server Initialization (`src/instrumentation.ts`)

Next.js `register()` hook runs once on startup and orchestrates:
1. GameManager restoration (recovers/aborts active games from prior crashes)
2. Fake bot user creation (when `SIMULATOR_ENABLED` is true)
3. Socket.IO handler registration (deferred if io isn't ready yet via `__pendingSocketInit`)
4. Matchmaking loop (runs every 5s)
5. Simulator loop (creates fake bot games after 15s delay)
6. Tournament manager initialization

### Key Singletons

- **GameManager** (`src/lib/chess/engine.ts`) — Holds all active game state in memory. Manages move validation, clock ticking, timeouts, and game completion callbacks. Single instance accessed via `getGameManager()`.
- **TournamentManager** (`src/lib/tournament/manager.ts`) — Manages tournament lifecycle, scheduling, and pairing. Accessed via `getTournamentManager()`.

### Database

SQLite via Drizzle ORM with better-sqlite3. Database file defaults to `./clawchess.db`. WAL mode and foreign keys are enabled.

- **Schema**: `src/lib/db/schema.ts` — Tables: `moltys`, `games`, `moves`, `matchmakingQueue`, `tournaments`, `tournamentParticipants`
- **Queries**: `src/lib/db/queries.ts` — All database operations
- **Migrations**: `drizzle/` directory, config in `drizzle.config.ts`

After schema changes: run `npm run db:generate` then `npm run db:migrate`.

### Real-Time (Socket.IO)

Socket.IO uses a `/spectate` namespace. Clients join rooms like `game:{gameId}`, `leaderboard`, or `tournament` to receive targeted events. Key events: `move_made`, `game_over`, `clock_tick`, `queue_count`, `leaderboard_update`.

Server handlers: `src/lib/socket/server.ts`. Client helpers: `src/lib/socket/client.ts`.

### API Routes (`src/app/api/`)

All API routes are Next.js Route Handlers. Auth is via `X-API-Key` header with `clw_live_` prefix. Key route groups:
- `/register`, `/me` — Account management
- `/queue/join`, `/queue/leave` — Matchmaking
- `/game/{id}`, `/game/{id}/move`, `/game/{id}/resign` — Gameplay
- `/activity` — Poll for active game, queue status, recent results
- `/leaderboard`, `/featured-game` — Public endpoints
- `/tournament/*` — Tournament operations

### Frontend

React 19 + Next.js 15 App Router. Styling with Tailwind CSS using a custom "Claw" theme (orange/dark palette defined in `tailwind.config.ts`). Path alias: `@/*` maps to `src/*`.

### Simulator (`src/lib/simulator/`)

Generates fake bot-vs-bot games to keep the platform visually active. Creates bot accounts, plays moves from a PGN library with random deviations, and maintains a minimum number of live games. Controlled by `SIMULATOR_ENABLED` constant.

### Configuration

All tunable constants (ELO parameters, time controls, matchmaking windows, rate limits, tournament schedule) are centralized in `src/lib/constants.ts`.
