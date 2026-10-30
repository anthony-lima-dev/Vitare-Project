#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.local ]]; then
  echo "Arquivo infra/local/.env.local não encontrado." >&2
  exit 1
fi

set -a
source ./.env.local
set +a

mkdir -p ./backups
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="./backups/vitare-${STAMP}.dump"

docker compose --env-file .env.local -f compose.yaml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner > "$OUT"

printf 'Backup criado: %s\n' "$OUT"
