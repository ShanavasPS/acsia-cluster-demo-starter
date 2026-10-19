#!/bin/bash
# Saves a PNG of the cluster window (528 × 692) a few seconds into the drive, with headless Chrome.
#   screenshot.sh [out.png] [seconds]     defaults: cluster.png in the current folder, 8 s
# Needs Chrome or Chromium. Without one, look at the open browser tab instead.
set -uo pipefail
source "$(dirname "$0")/common.sh"
OUT=${1:-cluster.png}
SECONDS_IN=${2:-8}
CHROME=$(find_chrome) || { echo "No Chrome or Chromium found for a headless screenshot." >&2; exit 1; }
case "$OUT" in /*) ;; *) OUT=$PWD/$OUT ;; esac
PROFILE=$(mktemp -d)   # a throwaway profile, so the user's open Chrome is not involved
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run --user-data-dir="$PROFILE" \
  --window-size=528,692 --virtual-time-budget=$((SECONDS_IN * 1000)) \
  --screenshot="$OUT" "file://$PAGE?view=cluster" >/dev/null 2>&1
rm -rf "$PROFILE"
[ -s "$OUT" ] || { echo "Chrome did not write a screenshot." >&2; exit 1; }
echo "Saved $OUT"
