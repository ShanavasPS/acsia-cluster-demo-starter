#!/bin/bash
# Prints the state of the AAOS cluster demo.
set -uo pipefail
source "$(dirname "$0")/common.sh"
if ! running; then echo "Emulator: not running"; exit 0; fi
booted || { echo "Emulator: booting"; exit 0; }
W=$(writable && echo writable || echo read-only)
echo "Emulator:       $ANDROID_SERIAL ($AVD), system $W"
if adb shell pm list packages | grep -q "$PKG\$"; then
  echo "Cluster app:    installed"
else echo "Cluster app:    not installed"; fi
adb shell pm list packages | grep -q com.acsia.showcase && echo "Showcase:       installed" || echo "Showcase:       not installed"
D=$(cluster_display); TOP=$(cluster_top)
echo "Cluster window: ${TOP:-nothing} (display $D)"
if rpm_live; then echo "Rpm:            live from the car"
else echo "Rpm:            -- (the app cannot read engine rpm)"; fi
# The pid file outlives a reboot, so check the process itself.
LOOP=$(adb shell 'p=$(cat /data/local/tmp/cluster-demo/pid 2>/dev/null); [ -n "$p" ] && [ -d /proc/$p ] && echo running || echo stopped' | tr -d '\r')
echo "Drive loop:     $LOOP"
U=$(adb shell cmd car_service get-property-value VEHICLE_SPEED_DISPLAY_UNITS | grep -oE 'Value: [0-9]+' | grep -oE '[0-9]+')
echo "Speed units:    $([ "$U" = "144" ] && echo mph || echo "code $U (144 = mph)")"
