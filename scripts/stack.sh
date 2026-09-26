#!/usr/bin/env bash
# A throwaway API + web stack on its own database and free ports, for smoke
# runs and UI checks. Never touches the main database (the one in .env) or
# the dev ports 3000/3002.
#
#   scripts/stack.sh up <name> [--api-only]   create, migrate, build, start
#   scripts/stack.sh down <name>              stop and drop everything
#
# The servers start from an empty environment (`env -i`) plus the variables
# set here; the rest comes from the repo .env. An agent harness started in a
# repo auto-loads that repo's .env, so every process it launches inherits its
# DATABASE_URL, and an inherited variable beats `bun --env-file`: without
# this, a smoke run lands on whatever database the harness loaded.
# SUPERADMIN_EMAIL is passed through when set, for seeds that need one.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
command="${1:-}"
name="${2:-}"
if [[ ! "$name" =~ ^[a-z0-9_]+$ ]] || [[ -z "$command" ]]; then
  echo "usage: scripts/stack.sh up|down <name: a-z 0-9 _> [--api-only]" >&2
  exit 2
fi
main_url="$(grep '^DATABASE_URL=' "$root/.env" | cut -d= -f2-)"
main_db="${main_url##*/}"
db="${main_db}_${name}"
url="${main_url%/*}/$db"
dir="$root/.scratchpad/stack-$name"
clean_env=(env -i "PATH=$PATH" "HOME=$HOME")

# Creates and drops through the server's `postgres` database with Bun's own
# client, so it works against any Postgres the .env points at.
sql() {
  "${clean_env[@]}" ADMIN_URL="${main_url%/*}/postgres" bun -e \
    'const sql = new Bun.SQL(process.env.ADMIN_URL); for (const statement of process.argv.slice(1)) await sql.unsafe(statement); await sql.close();' \
    "$@"
}

if [[ "$command" == "down" ]]; then
  for pid in $(cat "$dir"/*.pid 2>/dev/null); do kill "$pid" 2>/dev/null || true; done
  sql "drop database if exists $db with (force)"
  rm -rf "$dir"
  echo "down: $db"
  exit 0
fi
[[ "$command" == "up" ]] || { echo "unknown command: $command" >&2; exit 2; }
if [[ "$db" == "$main_db" ]]; then echo "refusing: $db is the main database" >&2; exit 1; fi

free_port() {
  local port
  while :; do
    port=$((RANDOM % 10000 + 40000))
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || { echo "$port"; return; }
  done
}
api_port="$(free_port)"
web_port="$(free_port)"
api="http://localhost:$api_port"
web="http://localhost:$web_port"

rm -rf "$dir"
mkdir -p "$dir/uploads"
sql "drop database if exists $db with (force)" "create database $db"
(cd "$root/packages/database" && "${clean_env[@]}" DATABASE_URL="$url" bunx drizzle-kit migrate >"$dir/migrate.log" 2>&1)

wait_for() {
  for _ in $(seq 60); do curl -s -o /dev/null "$1" && return; sleep 0.5; done
  echo "not up: $1 (logs in $dir)" >&2
  exit 1
}

(cd "$root/apps/api"; "${clean_env[@]}" DATABASE_URL="$url" PORT="$api_port" \
  BETTER_AUTH_URL="$api" BETTER_AUTH_TRUSTED_ORIGIN="$web" \
  UPLOADS_DIR="$dir/uploads" UPLOADS_URL="$api/uploads" \
  ${SUPERADMIN_EMAIL:+SUPERADMIN_EMAIL="$SUPERADMIN_EMAIL"} \
  nohup bun --env-file=../../.env ./src/main.ts >"$dir/api.log" 2>&1 & echo $! >"$dir/api.pid")
wait_for "$api/health"

if [[ "${3:-}" != "--api-only" ]]; then
  # Built, then copied out: another build rewriting apps/web/.output would
  # leave a running server with stale asset hashes (unstyled pages).
  (cd "$root/apps/web" && rm -rf .output && "${clean_env[@]}" VITE_API_URL="$api" bunx vite build >"$dir/build.log" 2>&1 && cp -R .output "$dir/web")
  (cd "$dir/web"; "${clean_env[@]}" PORT="$web_port" nohup bun --env-file="$root/.env" ./server/index.mjs >"$dir/web.log" 2>&1 & echo $! >"$dir/web.pid")
  wait_for "$web"
fi

echo "api: $api"
if [[ -f "$dir/web.pid" ]]; then echo "web: $web"; fi
echo "db:  $db"
echo "logs: $dir"
