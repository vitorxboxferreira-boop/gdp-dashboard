#!/usr/bin/env bash
# Aplica as migrations em um PostgreSQL local descartável e roda os testes SQL.
# Requer: psql + um servidor PostgreSQL acessível (PGHOST/PGPORT/PGUSER).
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${TEST_DB_NAME:-agency_sdr_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -X -q)
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d "$DB" -f tests/db/00_supabase_shim.sql
for f in supabase/migrations/*.sql; do
  echo "→ migration $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
echo "→ seed.sql"
"${PSQL[@]}" -d "$DB" -f supabase/seed.sql
for f in tests/db/[1-9]*.sql; do
  echo "→ teste $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done
echo "✔ todos os testes de banco passaram"
