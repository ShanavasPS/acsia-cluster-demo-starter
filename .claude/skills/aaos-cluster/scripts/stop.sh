#!/bin/bash
# Shuts the AAOS emulator down and waits until it has released the AVD.
set -uo pipefail
source "$(dirname "$0")/common.sh"
"$TOOLS/cluster-demo.sh" stop >/dev/null 2>&1 || true    # parks the car and ends any drive loop
running || { echo "$AVD is not running."; exit 0; }
adb emu kill >/dev/null 2>&1 || true
for i in $(seq 1 45); do running || { echo "$AVD stopped."; exit 0; }; sleep 2; done
echo "$AVD is still shutting down; wait a little before starting it again."
