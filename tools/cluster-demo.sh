#!/bin/bash
# Keeps the cluster demo playing in the AAOS cluster window.
#
#   ./cluster-demo.sh          drive the car in a loop: speed, rpm, gear, fuel and parking brake
#   ./cluster-demo.sh stop     stop driving and park the car (also what Ctrl+C does)
#   ./cluster-demo.sh replay   no car data: the app replays sim/drive-cycle.csv by itself
#
# Each lap: park, pull away, 80 mph, slow to 40 mph, stop.
# The driving loop runs on the emulator itself, so it keeps going even if this terminal is busy.
# Needs the app installed. "car" mode needs a build that reads live vehicle data; until then use "replay".
# Our rpm gauge shows "--": rpm needs a privileged system app. The cluster OS strip still shows rpm.
set -uo pipefail
source "$(cd "$(dirname "$0")" && pwd)/env.sh"
MODE=${1:-car}
PKG=com.acsia.cluster
VHAL=android.hardware.automotive.vehicle.IVehicle/default
DIR=/data/local/tmp/cluster-demo
SPEED=0x11600207 RPM=0x11600305 GEAR=0x11400400 BRAKE=0x11200402

# One waiting terminal at a time: end those of earlier runs, even with the emulator down.
# KILL skips their Ctrl+C trap; the loop on the device is stopped below.
for p in $(pgrep -f "bash [^ ]*cluster-demo\.sh( car)?$"); do [ "$p" != $$ ] && kill -KILL "$p" 2>/dev/null; done

adb get-state >/dev/null 2>&1 || { echo "No device $ANDROID_SERIAL. Start the AAOS emulator first."; exit 1; }

stop_driving() {  # kill the loop on the device, then leave the car parked and stopped
  # Freeze the loop so it cannot start a new lap, kill the lap it is running, then the loop itself.
  adb shell "P=\$(cat $DIR/pid 2>/dev/null); [ -n \"\$P\" ] && { kill -STOP \$P; pkill -P \$P; kill -KILL \$P; }; rm -f $DIR/pid" >/dev/null 2>&1
  adb shell "dumpsys $VHAL --set $SPEED -f 0; dumpsys $VHAL --set $RPM -f 0; dumpsys $VHAL --set $GEAR -i 4; dumpsys $VHAL --set $BRAKE -i 1" >/dev/null 2>&1
  echo "Stopped. Car parked."
}

if [ "$MODE" = "stop" ]; then adb root >/dev/null 2>&1; sleep 1; adb wait-for-device; stop_driving; exit 0; fi

adb shell pm list packages | grep -q "$PKG" || { echo "$PKG is not installed. Run ./gradlew installDebug in the demo repo."; exit 1; }
USER_ID=$(adb shell am get-current-user | tr -d '\r')
DISPLAY_ID=$(adb shell dumpsys car_service --services ClusterHomeService | grep mClusterDisplayId | grep -oE '[0-9]+')

perm() {  # grant or revoke the permissions that switch the app between car data and replay
  for p in CAR_SPEED CAR_ENERGY; do adb shell pm "$1" --user "$USER_ID" "$PKG" "android.car.permission.$p" >/dev/null 2>&1; done
}

show_in_cluster() {
  adb shell cmd car_service stop-fixed-activity-mode "$DISPLAY_ID" >/dev/null 2>&1
  adb shell am force-stop --user "$USER_ID" "$PKG"
  sleep 2
  adb shell cmd car_service start-fixed-activity-mode "$DISPLAY_ID" "$PKG" "$PKG.MainActivity" >/dev/null
  echo "Showing $PKG in the cluster window (display $DISPLAY_ID)."
}

if [ "$MODE" = "replay" ]; then
  adb root >/dev/null 2>&1; sleep 1; adb wait-for-device; stop_driving >/dev/null
  perm revoke
  show_in_cluster
  echo "Replay mode: the app loops the recorded drive by itself."
  exit 0
fi

adb root >/dev/null 2>&1; sleep 2; adb wait-for-device
stop_driving >/dev/null   # in case a previous loop is still running
perm grant
show_in_cluster

# Six laps, fuel 24 % down to 4 %, so the low-fuel light comes on in the last laps. Then it repeats.
python3 - > /tmp/cluster-demo-laps.sh <<'PY'
import math
V = 'dumpsys android.hardware.automotive.vehicle.IVehicle/default --set'
SPEED, RPM, GEAR, FUEL, BRAKE = '0x11600207', '0x11600305', '0x11400400', '0x11600307', '0x11200402'
out = []
def put(prop, kind, value): out.append(f'{V} {prop} {kind} {value} >/dev/null')
MPH = 1.609344                                              # the car reports km/h-based m/s; the cluster shows mph
def rpm_for(kmh, accelerating):
    if kmh < 1: return 800
    shifts = [0, 20, 40, 65, 95, 130, 200]                  # gear changes, km/h
    g = max(i for i in range(len(shifts) - 1) if kmh >= shifts[i])
    frac = (kmh - shifts[g]) / (shifts[g + 1] - shifts[g])
    return 1500 + frac * (3200 if accelerating else 1800)
def segment(seconds, v0, v1):                                # 10 updates a second, eased
    steps = int(seconds * 10)
    for i in range(steps):
        v = v0 + (v1 - v0) * (0.5 - 0.5 * math.cos(math.pi * i / steps))
        put(SPEED, '-f', f'{v / 3.6:.3f}')
        put(RPM, '-f', f'{rpm_for(v, v1 > v0):.0f}')
        out.append('sleep 0.1')
for fuel_pct in (24, 20, 16, 12, 8, 4):
    put(FUEL, '-f', f'{fuel_pct * 150:.0f}')              # 15000 mL tank
    put(GEAR, '-i', 4); put(BRAKE, '-i', 1); put(SPEED, '-f', 0); put(RPM, '-f', 800); out.append('sleep 3')
    put(BRAKE, '-i', 0); put(GEAR, '-i', 8); out.append('sleep 1')
    segment(14, 0, 80 * MPH); segment(6, 80 * MPH, 80 * MPH)     # up to 80 mph and cruise
    segment(6, 80 * MPH, 40 * MPH); segment(5, 40 * MPH, 40 * MPH); segment(8, 40 * MPH, 0)
    put(SPEED, '-f', 0); put(RPM, '-f', 800); put(GEAR, '-i', 4); put(BRAKE, '-i', 1); out.append('sleep 2')
print('\n'.join(out))
PY
adb shell mkdir -p $DIR >/dev/null
adb push /tmp/cluster-demo-laps.sh $DIR/laps.sh >/dev/null 2>&1
adb shell "nohup sh -c 'echo \$\$ > $DIR/pid; while true; do sh $DIR/laps.sh; done' >/dev/null 2>&1 &"
sleep 1
echo "Driving in a loop on the emulator (about 5 minutes per round of six laps)."
echo "Press Ctrl+C here, or run '$0 stop' from any terminal, to stop and park."
trap 'echo; stop_driving; exit 0' INT TERM
while true; do sleep 1; done
