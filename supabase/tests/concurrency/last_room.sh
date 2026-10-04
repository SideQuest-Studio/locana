#!/usr/bin/env bash
# Races two create_booking calls for the last room of a room type (inventory 1).
# Each session holds its transaction open for 2s after booking, so without the row lock
# both would see zero bookings and both would succeed. Expects exactly one winner.
#
# Leaves fixture rows committed in the local DB: run `npx supabase db reset` afterwards.
set -euo pipefail
export MSYS_NO_PATHCONV=1

DB=supabase_db_DIP
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(mktemp -d)"

docker exec -i "$DB" sh -c 'cat > /tmp/fixtures.psql' < "$HERE/../fixtures.psql"
docker exec -i "$DB" psql -U postgres -v ON_ERROR_STOP=1 -q <<'SQL' >/dev/null
BEGIN;
\i /tmp/fixtures.psql
COMMIT;
SQL

book() {
  docker exec -i "$DB" psql -U postgres -At <<SQL 2>&1
BEGIN;
SELECT set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.create_booking('e0000000-0000-0000-0000-0000000000b1', NULL, current_date + 40, current_date + 41)->>'reference';
SELECT pg_sleep(2);
COMMIT;
SQL
}

book a0000000-0000-0000-0000-0000000000c1 > "$OUT/r1" &
book a0000000-0000-0000-0000-0000000000c2 > "$OUT/r2" &
wait

echo "session 1:"; grep -E 'DIP-|ERROR' "$OUT/r1" || true
echo "session 2:"; grep -E 'DIP-|ERROR' "$OUT/r2" || true

WINS=$(cat "$OUT/r1" "$OUT/r2" | grep -c '^DIP-' || true)
SOLD_OUT=$(cat "$OUT/r1" "$OUT/r2" | grep -c 'SOLD_OUT' || true)
rm -rf "$OUT"

if [ "$WINS" = "1" ] && [ "$SOLD_OUT" = "1" ]; then
  echo "PASS: exactly one booking won, the other got SOLD_OUT"
else
  echo "FAIL: $WINS winner(s), $SOLD_OUT SOLD_OUT"
  exit 1
fi
