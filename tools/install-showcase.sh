#!/bin/bash
# Builds the showcase app and puts it in the launcher's map panel on the AAOS emulator.
# The showcase registers as the car's maps app, so the launcher embeds it instead of the placeholder.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
source "$HERE/env.sh"
"$HERE/cluster-demo.sh" stop >/dev/null 2>&1 || true      # park first: restarting the launcher while driving opens other apps
ensure_local_properties "$HERE/showcase-app"
(cd "$HERE/showcase-app" && ./gradlew -q assembleDebug)
adb install -r "$HERE/showcase-app/app/build/outputs/apk/debug/app-debug.apk" >/dev/null
USER_ID=$(adb shell am get-current-user | tr -d '\r')
for p in CAR_SPEED CAR_ENERGY; do adb shell pm grant --user "$USER_ID" com.acsia.showcase "android.car.permission.$p"; done
embedded() { adb shell dumpsys activity activities | grep -q "com.acsia.showcase.*mode=multi-window"; }
# Restart the launcher so it embeds the showcase. If the panel stays empty (it shows red), try again.
# The launcher can drop the showcase a second after embedding it, so it must stay embedded for 8 s.
for attempt in 1 2 3 4; do
  adb shell am force-stop --user "$USER_ID" com.android.car.carlauncher
  sleep 2
  adb shell input keyevent KEYCODE_HOME
  for i in $(seq 1 15); do
    if embedded; then
      stable=true
      for j in $(seq 1 8); do sleep 1; embedded || { stable=false; break; }; done
      if $stable; then
        echo "Showcase installed. It is in the map panel on the home screen."
        exit 0
      fi
      echo "The launcher dropped the showcase; restarting it (attempt $attempt)."
      break
    fi
    sleep 1
  done
done
echo "The launcher did not embed the showcase. Open the home screen and run this script again."
exit 1
