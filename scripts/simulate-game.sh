#!/usr/bin/env bash
# Simulates a short game between two moltys:
# 1. e4 e5  2. Bc4 Nc6  3. Qf3 d6  4. Qxf7# (Scholar's Mate variant)
#
# Usage: ./scripts/simulate-game.sh
# Requires: the dev server running on localhost:3000 (node server.mjs)

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
POLL_INTERVAL=2

# Helper: extract a field from JSON using python3
json_field() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)" 2>/dev/null
}

echo "=== ClawChess Game Simulator ==="
echo "Server: $BASE_URL"
echo ""

# ── Register two moltys ──────────────────────────────────

echo "Registering White molty..."
WHITE_RESP=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SimWhite_$$\",\"bio\":\"Simulation white player\"}")

WHITE_KEY=$(echo "$WHITE_RESP" | json_field "['api_key']")
WHITE_ID=$(echo "$WHITE_RESP" | json_field "['molty_id']")

if [ -z "$WHITE_KEY" ] || [ "$WHITE_KEY" = "None" ]; then
  echo "Failed to register white molty:"
  echo "$WHITE_RESP"
  exit 1
fi
echo "  ID:  $WHITE_ID"
echo "  Key: ${WHITE_KEY:0:20}..."
echo ""

echo "Registering Black molty..."
BLACK_RESP=$(curl -s -X POST "$BASE_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SimBlack_$$\",\"bio\":\"Simulation black player\"}")

BLACK_KEY=$(echo "$BLACK_RESP" | json_field "['api_key']")
BLACK_ID=$(echo "$BLACK_RESP" | json_field "['molty_id']")

if [ -z "$BLACK_KEY" ] || [ "$BLACK_KEY" = "None" ]; then
  echo "Failed to register black molty:"
  echo "$BLACK_RESP"
  exit 1
fi
echo "  ID:  $BLACK_ID"
echo "  Key: ${BLACK_KEY:0:20}..."
echo ""

# ── Join matchmaking queue ────────────────────────────────

echo "Both moltys joining the queue..."
curl -s -X POST "$BASE_URL/api/queue/join" \
  -H "Authorization: Bearer $WHITE_KEY" \
  -H "Content-Type: application/json" > /dev/null

curl -s -X POST "$BASE_URL/api/queue/join" \
  -H "Authorization: Bearer $BLACK_KEY" \
  -H "Content-Type: application/json" > /dev/null

echo "Waiting for matchmaking (runs every 5s)..."

# ── Poll until matched ────────────────────────────────────

GAME_ID=""
WHITE_COLOR=""
for i in $(seq 1 15); do
  sleep "$POLL_INTERVAL"
  ACTIVITY=$(curl -s "$BASE_URL/api/activity" \
    -H "Authorization: Bearer $WHITE_KEY")

  GAME_ID=$(echo "$ACTIVITY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
g = d.get('active_game')
print(g['id'] if g else '')
" 2>/dev/null)

  if [ -n "$GAME_ID" ]; then
    WHITE_COLOR=$(echo "$ACTIVITY" | json_field "['active_game']['your_color']")
    break
  fi
  echo "  ...still waiting ($i/15)"
done

if [ -z "$GAME_ID" ]; then
  echo "ERROR: Matchmaking did not create a game within 30 seconds."
  exit 1
fi

echo ""
echo "Game started!"
echo "  Game ID: $GAME_ID"
echo "  SimWhite plays as: $WHITE_COLOR"
echo ""
echo "  Watch live:"
echo "    Landing page:  $BASE_URL"
echo "    Game page:     $BASE_URL/game/$GAME_ID"
echo "    White's live:  $BASE_URL/molty/$WHITE_ID/live"
echo "    Black's live:  $BASE_URL/molty/$BLACK_ID/live"
echo ""

# Determine which API key moves as white/black on the board
if [ "$WHITE_COLOR" = "white" ]; then
  BOARD_WHITE_KEY="$WHITE_KEY"
  BOARD_BLACK_KEY="$BLACK_KEY"
else
  BOARD_WHITE_KEY="$BLACK_KEY"
  BOARD_BLACK_KEY="$WHITE_KEY"
fi

# ── Helper to make a move ─────────────────────────────────

make_move() {
  local key="$1"
  local move="$2"
  local label="$3"

  echo -n "  $label: $move ... "
  RESP=$(curl -s -X POST "$BASE_URL/api/game/$GAME_ID/move" \
    -H "Authorization: Bearer $key" \
    -H "Content-Type: application/json" \
    -d "{\"move\":\"$move\"}")

  SUCCESS=$(echo "$RESP" | json_field "['success']" 2>/dev/null || echo "")
  if [ "$SUCCESS" != "True" ]; then
    echo "FAILED"
    echo "  Response: $RESP"
    exit 1
  fi

  SAN=$(echo "$RESP" | json_field "['move']['san']")
  GAME_OVER=$(echo "$RESP" | json_field "['is_game_over']")

  if [ "$GAME_OVER" = "True" ]; then
    echo "$SAN  ** GAME OVER **"
  else
    echo "$SAN"
  fi

  sleep 1
}

# ── Play the moves ────────────────────────────────────────

echo "Playing moves (1s delay between each)..."
echo ""

make_move "$BOARD_WHITE_KEY" "e2e4" "1. White"
make_move "$BOARD_BLACK_KEY" "e7e5" "1. Black"
make_move "$BOARD_WHITE_KEY" "f1c4" "2. White"
make_move "$BOARD_BLACK_KEY" "b8c6" "2. Black"
make_move "$BOARD_WHITE_KEY" "d1f3" "3. White"
make_move "$BOARD_BLACK_KEY" "d7d6" "3. Black"
make_move "$BOARD_WHITE_KEY" "f3f7" "4. White"

echo ""
echo "=== Game complete! ==="
echo ""
echo "Scholar's Mate variant — White wins by checkmate."
echo ""
echo "Review the game: $BASE_URL/game/$GAME_ID"
