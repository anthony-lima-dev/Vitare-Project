#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ $# -ne 1 ]]; then
  echo "Uso: $0 backups/vitare-YYYYMMDD-HHMMSS.dump" >&2
  exit 1
fi

set -a
source ./.env.local
set +a

if [[ ! -f "$1" ]]; then
  echo "Backup não encontrado: $1" >&2
  exit 1
fi

cat "$1" | docker compose --env-file .env.local -f compose.yaml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner

echo "Restore concluído."
