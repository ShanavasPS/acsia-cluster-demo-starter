#!/bin/bash
# Brings up the AAOS emulator (creating the AVD the first time) and sets speed units to mph.
#   start.sh              normal, read-only system
#   start.sh --writable   writable system partition
set -uo pipefail
source "$(dirname "$0")/common.sh"
WRITABLE=""; [ "${1:-}" = "--writable" ] && WRITABLE="-writable-system"

# Linux needs hardware acceleration (KVM), or the emulator is far too slow to use.
if [ "$(uname -s)" = "Linux" ] && [ ! -w /dev/kvm ]; then
  echo "/dev/kvm is missing or not writable. Enable virtualisation in the BIOS and add yourself to the kvm group:"
  echo "  sudo usermod -aG kvm \$USER   (then log out and in)"; exit 1
fi

if ! emulator -list-avds | grep -qx "$AVD"; then
  command -v sdkmanager >/dev/null || { echo "sdkmanager not found: install the Android SDK command-line tools."; exit 1; }
  echo "Creating AVD $AVD (Android Automotive 15, $ABI)…"
  IMG="system-images;android-35-ext15;android-automotive;${ABI}"
  yes | sdkmanager "$IMG" >/dev/null
  echo no | avdmanager create avd -n "$AVD" -k "$IMG" -d automotive_1080p_landscape >/dev/null
  CFG=${ANDROID_AVD_HOME:-$HOME/.android/avd}/$AVD.avd/config.ini
  # Rewrite through a temp file: "sed -i" takes different arguments on macOS and Linux.
  sed -e 's/^hw.ramSize=.*/hw.ramSize=4096M/' -e 's/^hw.keyboard=.*/hw.keyboard=yes/' "$CFG" > "$CFG.tmp" && mv "$CFG.tmp" "$CFG"
fi

if running && booted; then
  echo "$AVD is already running as $ANDROID_SERIAL. Stop it first (stop.sh) to change mode."
  exit 0
fi

# A previous instance can take a while to release the AVD; until then a new one fails with
# "Running multiple emulators with the same AVD". So wait for it, then retry the launch.
for i in $(seq 1 30); do running || break; sleep 2; done
for try in 1 2 3 4 5 6; do
  nohup emulator -avd "$AVD" -port "$PORT" $WRITABLE -no-snapshot-load > "$LOG_DIR/emulator.log" 2>&1 &
  sleep 12
  running && break
  grep -q "multiple emulators" "$LOG_DIR/emulator.log" && { sleep 8; continue; }
  echo "Emulator did not start. See $LOG_DIR/emulator.log"; tail -5 "$LOG_DIR/emulator.log"; exit 1
done
running || { echo "Emulator did not start after retries. See $LOG_DIR/emulator.log"; exit 1; }
wait_boot || exit 1

# The cluster demo shows mph; the car's own display units follow, so Google's strip matches.
adb shell cmd car_service set-property-value VEHICLE_SPEED_DISPLAY_UNITS 0 144 >/dev/null   # MILES_PER_HOUR
adb shell cmd car_service set-property-value DISTANCE_DISPLAY_UNITS 0 36 >/dev/null         # MILE
echo "$AVD is up as $ANDROID_SERIAL${WRITABLE:+ (writable system)}. Cluster display: $(cluster_display)."
