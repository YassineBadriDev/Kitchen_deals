#!/usr/bin/env bash
# Install Kitchen Deals cron as systemd service+timer on the Vultr box.
# Run once, as root, from anywhere (paths are resolved relative to this file).
#
# The timer is installed but left DISABLED: the primary scheduler is GitHub
# Actions (.github/workflows/trigger-vultr.yml), which SSHes in and runs
# vultr/trigger-scrape.sh. Enabling the timer as well would make the two
# schedulers race for the same box.
#
# Set KITCHEN_DEALS_ENABLE_TIMER=1 to make the timer the primary scheduler
# instead (and disable the GitHub Actions trigger).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="$(dirname "$DIR")"

cp "$DIR/kitchen-deals.service" "$DIR/kitchen-deals.timer" /etc/systemd/system/
systemctl daemon-reload

if [ "${KITCHEN_DEALS_ENABLE_TIMER:-0}" = "1" ]; then
  systemctl enable --now kitchen-deals.timer
  echo "installed. timer ENABLED (primary scheduler)."
  systemctl list-timers kitchen-deals.timer --no-pager
else
  systemctl disable --now kitchen-deals.timer 2>/dev/null || true
  echo "installed. timer left DISABLED - GitHub Actions is the primary scheduler."
  echo "to flip it: KITCHEN_DEALS_ENABLE_TIMER=1 bash $DIR/install.sh"
fi
