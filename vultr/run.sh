#!/usr/bin/env bash
# Kitchen Deals refresh job.
# Scrapes Amazon/Walmart/BestBuy/Target, pushes into the Cloudflare Worker's D1,
# then commits src/data as a versioned archive on GitHub.
#
# Triggered by .github/workflows/trigger-vultr.yml (GitHub Actions -> SSH -> here).
# The scrape and the Cloudflare push both happen on this box; GitHub only triggers
# and verifies.
set -euo pipefail
cd "$(dirname "$0")/.."

# Never leave a browser behind. An earlier version of this box leaked a
# chrome-headless process per scrape, which filled the RAM and got this job
# OOM-killed; clean up on every exit path.
cleanup_browsers() {
  pkill -TERM -f 'playwright_chromiumdev_profile' 2>/dev/null || true
  pkill -TERM -f 'chrome-headless-shell' 2>/dev/null || true
  sleep 1
  pkill -KILL -f 'playwright_chromiumdev_profile' 2>/dev/null || true
  pkill -KILL -f 'chrome-headless-shell' 2>/dev/null || true
}
trap cleanup_browsers EXIT

# Load secrets (INGEST_TOKEN, affiliate tags, optional HEALTHCHECK_URL)
if [ -f vultr/.env ]; then set -a; source vultr/.env; set +a; fi

# Deterministic sync: always start from the current origin, discard any local
# drift left by a previously killed run.
git fetch --quiet origin
git reset --quiet --hard origin/HEAD 2>/dev/null || git reset --quiet --hard origin/main

if [ ! -d node_modules ]; then
  PUPPETEER_SKIP_DOWNLOAD=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund
fi

SCRAPE_PROFILE=false SCRAPE_PLAYWRIGHT=true SCRAPE_STEALTH=true SCRAPE_HTTP=true \
  node src/scraping/scheduler.js --once

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

# Push to the live site. This is what updates kitchendeals.org, so it runs last:
# if it fails the job exits non-zero and the GitHub Actions workflow reports it.
echo "Pushing to Cloudflare Worker (D1)..."
node scripts/push-to-worker.js --url https://kitchendeals.org

[ -n "${HEALTHCHECK_URL:-}" ] && curl -fsS -m 10 "$HEALTHCHECK_URL" || true
echo "[kitchen-deals] done $(date -u +%FT%TZ)"
