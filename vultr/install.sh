#!/usr/bin/env bash
# Install Kitchen Deals cron as systemd service+timer on the Vultr box.
# Run once, as root, from anywhere (paths are resolved relative to this file).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
SITE_DIR="$(dirname "$DIR")"

cp "$DIR/kitchen-deals.service" "$DIR/kitchen-deals.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kitchen-deals.timer
echo "installed. next runs:"
systemctl list-timers kitchen-deals.timer --no-pager
