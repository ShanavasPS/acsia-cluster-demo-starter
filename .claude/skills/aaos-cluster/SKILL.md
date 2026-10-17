---
name: aaos-cluster
description: Bring up, demo, reset or inspect the Android Automotive (AAOS) emulator used for the Acsia instrument cluster demo. Use when asked to start the AAOS or cluster emulator, show the cluster running, run the drive loop or showcase, clean the emulator for a live demo, or check its state.
---

# AAOS cluster emulator

The demo runs on the `AAOS_API35` emulator (Android Automotive 15) as `emulator-5556`, on macOS or Linux. The cluster app is this repo; the drive loop, the showcase app and the SDK setup are in `tools/`.

## Rules

- Only ever touch `emulator-5556`. Every script sets `ANDROID_SERIAL`. Other emulators on the machine (for example a Pixel on `emulator-5554`) belong to the user.
- Use the scripts below rather than retyping the steps: each one handles a trap listed at the end.

## macOS and Linux

The scripts run on both. `tools/env.sh` finds the Android SDK (`$ANDROID_HOME`, `$ANDROID_SDK_ROOT`, `~/Library/Android/sdk` or `~/Android/Sdk`) and puts `adb`, `emulator` and `sdkmanager` on the PATH. The AVD uses the arm64 system image on ARM machines and x86_64 elsewhere. On Linux, `start.sh` stops early if `/dev/kvm` is missing or not writable, with the fix. If a script fails because the SDK or JDK 17 is missing, point the user to "Setup" in the repo README.

## Scripts

All in `scripts/` next to this file. Run them from anywhere.

| Task | Command | Notes |
|---|---|---|
| Start the emulator | `scripts/start.sh` | Creates the AVD on first use, waits for boot, sets speed units to mph. Returns at once if it is already up. |
| Show the demo | `scripts/demo.sh [ref]` | Builds and installs this repo as it is now (or `ref`, in a temporary worktree), puts it in the cluster window, installs the showcase on the centre screen unless it is already there, and starts the drive loop. |
| Clean for a live run | `scripts/reset.sh` | Parks the car, hands the cluster window back, uninstalls the cluster app, turns adb root off. Keeps the showcase. |
| Check the state | `scripts/status.sh` | Emulator mode, what is installed, what the cluster window shows, whether the drive loop runs, speed units. |
| Stop the emulator | `scripts/stop.sh` | Waits until the AVD is released, so the next start does not fail. |

Stopping or starting only the car: `../../../tools/cluster-demo.sh stop` parks it; `../../../tools/cluster-demo.sh` drives again; `../../../tools/cluster-demo.sh replay` lets the app replay its recorded drive.

## Typical requests

- "Bring up the emulator and show me the cluster": `start.sh`, then `demo.sh`. Take a screenshot to confirm (below).
- "Get it ready for the live demo": `start.sh`, then `reset.sh`, then `status.sh`. Expect: read-only system, cluster app not installed, showcase installed, drive loop stopped, mph.

To check what the screens show, screenshot each display by its physical id:

```sh
source scripts/common.sh
adb exec-out screencap -p -d "$(cluster_screen_id)" > cluster.png   # instrument cluster
adb exec-out screencap -p -d "$(main_screen_id)" > main.png         # centre screen
```

## Facts

| What | Value |
|---|---|
| Device | `emulator-5556`, AVD `AAOS_API35` |
| Cluster window | Display 3 (`cluster_display` in `common.sh`), 528 × 692; its physical screen is `EMU_display_1`, 528 × 792. Google's cluster draws the strip below the window and the icons beside it |
| Driver | User 10, not 0. Runtime permissions must be granted with `pm grant --user 10` |
| Car permissions | `CAR_SPEED` and `CAR_ENERGY` are runtime (grant them); `CAR_ENGINE_DETAILED` (rpm) needs a privileged system app, so the rev counter shows "--" |
| Show an app in the cluster | `adb shell cmd car_service start-fixed-activity-mode 3 com.acsia.cluster com.acsia.cluster.MainActivity`; `stop-fixed-activity-mode 3` gives it back |
| Speed units | `VEHICLE_SPEED_DISPLAY_UNITS` 144 = mph, 145 = km/h. Google's own cluster strip shows mph regardless |
| Drive the car by hand | `adb shell cmd car_service inject-continuous-events 0x11600207 25 -s 10 -d 30` (speed in m/s); a single `inject-vhal-event` is overwritten within 100 ms |

## Traps these scripts avoid

- **Starting too soon after a stop** fails with "Running multiple emulators with the same AVD". `stop.sh` waits for the AVD to be released and `start.sh` retries.
- **Restarting the launcher while the car is moving** opens blocked test apps and turns the map panel red. The showcase install parks the car first and retries until the showcase is embedded.
- **Reinstalling the showcase blinks the map panel red** while the app is replaced and the launcher restarts. `demo.sh` skips it when the showcase is already embedded (`ensure_showcase` in `common.sh`); run `../../../tools/install-showcase.sh` by hand, before the session, to put a changed showcase on the screen.
- **Reinstalling the cluster app** drops it from the cluster window and can make fixed-activity mode give up. Stop fixed mode, force-stop the app, then start fixed mode again (`demo.sh` and the drive loop do this).
- **`pm grant` without `--user 10`** succeeds but changes nothing; the app silently falls back to the recorded drive.
- **Google's cluster strip keeps stale values** (an old gear or rpm) after the car changes. The car's real value is what `cmd car_service get-property-value` returns; our cluster shows that.
