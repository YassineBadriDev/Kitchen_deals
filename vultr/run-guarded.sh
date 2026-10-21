#!/bin/bash
# run-guarded.sh REPO_DIR CMD LOG_NAME
#
# Runs a scraper with a hard timeout in its own process group, then removes
# any browser it left behind. The previous raw cron entries ran unbounded, so
# every 6h slot left a detached chrome behind: after 19 days that was 146
# scraper processes and 378 chrome processes (~2.9GB) on a 3.9GB box, which
# starved the other jobs (kitchen-deals was OOM-killed on 19 Oct).
#
# The old safety net in auto-scrape.sh used
#   pkill -f "user-data-dir=/tmp/playwright.*$(basename "$REPO_DIR")"
# which can never match: Playwright profile dirs are random names
# (/tmp/playwright_chromiumdev_profile-XXXXXX), not repo names. We snapshot
# the chrome PIDs before and after instead, and kill the ones that are new
# and orphaned (ppid 1) or still in our process group.

REPO_DIR="$1"
SCRAPE_CMD="$2"
LOG_NAME="$3"

TIMEOUT="${SCRAPE_TIMEOUT:-2700}"   # 45 min
LOG="/var/log/${LOG_NAME}.log"
CHROME_RE='ms-playwright/.*/chrome'

snapshot() { pgrep -f "$CHROME_RE" 2>/dev/null | sort -n | tr '\n' ' '; }

BEFORE="$(snapshot)"

cd "$REPO_DIR" || { echo "  cd $REPO_DIR failed" >> "$LOG"; exit 1; }

echo "=== $(date '+%Y-%m-%d %H:%M:%S') guarded start (timeout ${TIMEOUT}s) ${LOG_NAME} ===" >> "$LOG"

setsid bash -c "timeout --signal=TERM --kill-after=60s ${TIMEOUT} ${SCRAPE_CMD}" >> "$LOG" 2>&1 &
SCRAPE_PGID=$!
wait "$SCRAPE_PGID"
SCRAPE_EXIT=$?

# Tear down the whole process group (the node worker + any browser it
# spawned that did not detach on its own).
kill -TERM -- "-$SCRAPE_PGID" 2>/dev/null
sleep 2
kill -KILL -- "-$SCRAPE_PGID" 2>/dev/null
sleep 1

# Kill browsers this run left behind: new since BEFORE, and either orphaned
# (reparented to init) or still inside our process group.
AFTER="$(snapshot)"
KILLED=0
for p in $AFTER; do
  case " $BEFORE " in *" $p "*) continue ;; esac
  ppid=$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ')
  pgid=$(ps -o pgid= -p "$p" 2>/dev/null | tr -d ' ')
  if [ "$ppid" = "1" ] || [ "$pgid" = "$SCRAPE_PGID" ]; then
    kill -KILL "$p" 2>/dev/null && KILLED=$((KILLED+1))
  fi
done

echo "  Scrape exit: $SCRAPE_EXIT (browser leaks reaped: $KILLED)" >> "$LOG"
echo "=== $(date '+%Y-%m-%d %H:%M:%S') guarded end ${LOG_NAME} ===" >> "$LOG"

exit "$SCRAPE_EXIT"

