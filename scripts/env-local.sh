#!/usr/bin/env bash
# Writes .env.local from the running local Supabase stack. Keeps any other values already set.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(supabase status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
[ -f .env.local ] || cp .env.example .env.local
set_var() { if grep -q "^$1=" .env.local; then sed -i.bak "s#^$1=.*#$1=$2#" .env.local; else echo "$1=$2" >> .env.local; fi; }
set_var NEXT_PUBLIC_SUPABASE_URL "$API_URL"
set_var NEXT_PUBLIC_SUPABASE_ANON_KEY "$ANON_KEY"
set_var SUPABASE_SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY"
grep -q '^CRON_SECRET=.\+' .env.local || set_var CRON_SECRET "$(openssl rand -hex 24)"
rm -f .env.local.bak
echo "Wrote .env.local"
