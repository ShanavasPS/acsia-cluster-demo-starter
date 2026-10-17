#!/bin/bash
# Leaves the emulator clean for a live run from the start: car parked, cluster window handed back,
# cluster app removed, adb root off. The showcase stays installed.
set -uo pipefail
source "$(dirname "$0")/common.sh"
"$TOOLS/cluster-demo.sh" stop >/dev/null 2>&1 || true    # parks the car and ends any drive loop
booted || { echo "Emulator not running."; exit 0; }
D=$(cluster_display)
adb shell cmd car_service stop-fixed-activity-mode "$D" >/dev/null 2>&1 || true
adb uninstall "$PKG" >/dev/null 2>&1 || true
# Handing the window back leaves it empty until a reboot, so bring Google's cluster home back.
adb shell am start --user 0 --display "$D" -n com.android.car.cluster.home/.ClusterHomeActivity >/dev/null 2>&1 || true
adb unroot >/dev/null 2>&1 || true
echo "Reset: car parked, cluster window back to Google's cluster home, $PKG removed."
