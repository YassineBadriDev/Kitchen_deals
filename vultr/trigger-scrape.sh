#!/bin/bash
# trigger-scrape.sh — start a kitchen-deals scrape on the Vultr box, detached.
#
# Invoked over SSH by the GitHub Actions workflow (.github/workflows/trigger-vultr.yml).
# Returns immediately; the workflow polls the exit-status file afterwards.
#
# Exit codes:
#   0 = scrape started
#   3 = a scrape is already running (nothing to do)
#   1 = could not start
set -u

PROJECT="/opt/kitchen-deals"
LOGDIR="${PROJECT}/logs"
LOCKFILE="/var/lock/kitchendeals-scrape.lock"
STATUS="${LOGDIR}/trigger-status.log"
EXITFILE="${LOGDIR}/trigger-exit"
RUNLOG="${LOGDIR}/trigger-$(date -u +%Y%m%d-%H%M%S).log"

mkdir -p "$LOGDIR" "$LOGDIR/state"

# --- single-instance guard -------------------------------------------------
exec 9>"$LOCKFILE"
if ! flock -n 9; then
  echo "ALREADY_RUNNING lock $(date -u +%FT%TZ)" >> "$STATUS"
  echo "A scrape is already running."
  exit 3
fi
if pgrep -f "${PROJECT}/vultr/run.sh" >/dev/null 2>&1; then
  echo "ALREADY_RUNNING proc $(date -u +%FT%TZ)" >> "$STATUS"
  echo "A scrape is already running."
  exit 3
fi

# --- start detached --------------------------------------------------------
rm -f "$EXITFILE"
setsid bash -c "
  cd ${PROJECT} || exit 1
  timeout --signal=TERM --kill-after=120s 5400 ./vultr/run.sh > '${RUNLOG}' 2>&1
  echo \$? > '${EXITFILE}'
" </dev/null >/dev/null 2>&1 &

BG_PID=$!
echo "STARTED pid=${BG_PID} log=${RUNLOG} $(date -u +%FT%TZ)" >> "$STATUS"
echo "Started kitchen-deals scrape."
echo "log=${RUNLOG}"
exit 0
