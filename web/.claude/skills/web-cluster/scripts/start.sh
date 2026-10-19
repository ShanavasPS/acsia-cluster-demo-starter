#!/bin/bash
# Opens the web cluster in the default browser, straight from disk.
#   start.sh           the car drives in a loop
#   start.sh parked    the car starts parked
#   start.sh off       no car: the app replays its recording
# Run it again to open a fresh copy after changing the app (or reload the tab).
set -uo pipefail
source "$(dirname "$0")/common.sh"
MODE=${1:-drive}
case "$MODE" in
  drive) QUERY="" ;;
  parked|off) QUERY="?car=$MODE" ;;
  *) echo "Usage: start.sh [parked|off]" >&2; exit 1 ;;
esac
open_url "file://$PAGE$QUERY" || exit 1
echo "Opened file://$PAGE$QUERY"
case "$MODE" in
  drive) echo "The car drives in a loop. Park and Drive are below the cluster window." ;;
  parked) echo "The car is parked. Press Drive below the cluster window to start the loop." ;;
  off) echo "No car: the app has to replay sim/drive-cycle.csv by itself." ;;
esac
