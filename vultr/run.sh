#!/usr/bin/env bash
# Kitchen Deals refresh job — Vultr replacement for .github/workflows/scrape.yml
# Scrapes Amazon/Walmart/BestBuy/Target, pushes into the Cloudflare Worker's D1,
# then commits src/data as a versioned archive on GitHub.
set -euo pipefail
cd "$(dirname "$0")/.."

# Load secrets (INGEST_TOKEN, affiliate tags, optional HEALTHCHECK_URL)
if [ -f vultr/.env ]; then set -a; source vultr/.env; set +a; fi

git pull --ff-only origin HEAD || git pull --ff-only

if [ ! -d node_modules ]; then
  PUPPETEER_SKIP_DOWNLOAD=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
fi

SCRAPE_PROFILE=false SCRAPE_PLAYWRIGHT=true SCRAPE_STEALTH=true SCRAPE_HTTP=true \
  node src/scraping/scheduler.js --once

node scripts/push-to-worker.js --url https://kitchendeals.org

git config user.name "vultr-data-bot"
git config user.email "data-bot@users.noreply.github.com"
git add -A src/data
if ! git diff --cached --quiet; then
  git commit -m "data: refresh scraped deals ($(date -u +%FT%TZ))"
  for i in 1 2 3; do
    git pull --rebase origin HEAD 2>/dev/null || true
    git push && break
    echo "push rejected, retry $i"; sleep 10
  done
else
  echo "no data changes to commit"
fi

[ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 "$HEALTHCHECK_URL" || true
echo "[kitchen-deals] done $(date -u +%FT%TZ)"
