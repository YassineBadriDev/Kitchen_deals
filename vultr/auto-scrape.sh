#!/bin/bash
# auto-scrape.sh — scrape -> build -> deploy -> git push
# Usage: auto-scrape.sh REPO_DIR SCRAPE_CMD LOG_NAME [BUILD_CMD] [DEPLOY_CMD]
#
# 2026-10-21: hard timeouts + orphan reaping.
# Previously the scrape ran unbounded, so every daily cron left a zombie
# run.mjs plus its chrome-headless children behind. After 19 days that was
# 146 scraper processes and 378 browser processes holding ~2.9GB on a 3.9GB
# box, which starved every other job (the kitchen-deals scrape was OOM-killed
# on 19 Oct and timed out on 20 Oct).
REPO_DIR="$1"
SCRAPE_CMD="$2"
LOG_NAME="$3"
BUILD_CMD="$4"
DEPLOY_CMD="$5"
LOG="/var/log/${LOG_NAME}.log"

SCRAPE_TIMEOUT="${SCRAPE_TIMEOUT:-2700}"   # 45 min
BUILD_TIMEOUT="${BUILD_TIMEOUT:-900}"       # 15 min
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-900}"     # 15 min

echo "=== $(date '+%Y-%m-%d %H:%M:%S') Starting ${LOG_NAME} ===" >> "$LOG"

cd "$REPO_DIR" || exit 1
git pull --quiet >> "$LOG" 2>&1

# Run the scrape in its own process group with a hard timeout, so a hung
# scraper can never outlive its cron slot.
setsid bash -c "timeout --signal=TERM --kill-after=60s ${SCRAPE_TIMEOUT} $SCRAPE_CMD" >> "$LOG" 2>&1 &
SCRAPE_PGID=$!
wait "$SCRAPE_PGID"
SCRAPE_EXIT=$?

# Reap anything the scrape left behind (browsers, node workers) before moving on.
if [ -n "$(pgrep -P "$SCRAPE_PGID" 2>/dev/null)" ]; then
  echo "  Reaping orphaned children of scrape group $SCRAPE_PGID" >> "$LOG"
  pkill -TERM -P "$SCRAPE_PGID" 2>/dev/null
fi
kill -TERM -- "-$SCRAPE_PGID" 2>/dev/null
sleep 2
kill -KILL -- "-$SCRAPE_PGID" 2>/dev/null
echo "  Scrape exit: $SCRAPE_EXIT" >> "$LOG"

if [ -n "$BUILD_CMD" ]; then
    echo "  Building..." >> "$LOG"
    timeout --signal=TERM --kill-after=30s "${BUILD_TIMEOUT}" bash -c "$BUILD_CMD" >> "$LOG" 2>&1
    BUILD_EXIT=$?
    echo "  Build exit: $BUILD_EXIT" >> "$LOG"
fi

if [ -n "$DEPLOY_CMD" ]; then
    echo "  Deploying..." >> "$LOG"
    timeout --signal=TERM --kill-after=30s "${DEPLOY_TIMEOUT}" bash -c "$DEPLOY_CMD" >> "$LOG" 2>&1
    DEPLOY_EXIT=$?
    echo "  Deploy exit: $DEPLOY_EXIT" >> "$LOG"
fi

if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "scrape: auto update $(date '+%Y-%m-%d %H:%M')" --quiet >> "$LOG" 2>&1
    git push origin HEAD --quiet >> "$LOG" 2>&1
    echo "  Pushed changes to GitHub" >> "$LOG"
else
    echo "  No changes to push" >> "$LOG"
fi

# Final safety net: no browser process belonging to this repo should survive.
pkill -f "user-data-dir=/tmp/playwright.*$(basename "$REPO_DIR")" 2>/dev/null

echo "=== $(date '+%Y-%m-%d %H:%M:%S') Finished ${LOG_NAME} ===" >> "$LOG"
