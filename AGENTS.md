# AGENTS.md

Android instrument cluster MVP. Kotlin, Jetpack Compose, single `app` module.

The web version in `web/` is separate, with its own `AGENTS.md`. These rules do not apply there.

## Commands
- Build: `./gradlew assembleDebug`
- Unit tests (JVM, includes Robolectric Compose tests): `./gradlew testDebugUnitTest`
- Install: `./gradlew installDebug`
- Device: the cluster emulator is `emulator-5556`. Always set `ANDROID_SERIAL=emulator-5556` for adb, Gradle installs and Maestro (`maestro --device emulator-5556`). Never touch other devices.
- The emulator is Android Automotive OS with a separate instrument cluster display.
  - Cluster window display id: `adb shell dumpsys car_service --services ClusterHomeService | grep mClusterDisplayId`
  - Show our activity in the cluster window: `adb shell cmd car_service start-fixed-activity-mode <clusterDisplayId> com.acsia.cluster <activity class>`
  - Give the cluster back to the system: `adb shell cmd car_service stop-fixed-activity-mode <clusterDisplayId>`
  - Screenshot the cluster: find the physical display named `EMU_display_1` with `adb shell dumpsys SurfaceFlinger --display-id`, then `adb exec-out screencap -p -d <that id>`
  - Maestro only drives the main display. Run end-to-end flows there.

## Where things are
- Requirements: `docs/hmi-spec.md`, `docs/signals.csv`
- Plans: `docs/plan.md`, `docs/tech-plan.md`, `docs/test-cases.md`
- Replay data: `sim/drive-cycle.csv`
- Visual reference: `design/cluster.png`
- End-to-end flows: `e2e/`

## Rules
- Nothing blocking on the main thread. Signal parsing and replay run on `Dispatchers.Default`.
- Read signals only through the `SignalSource` interface.
- Every signal value is range-checked against `docs/signals.csv` before display.
- No hard-coded limits or colours in composables. Put them in one config or theme file.
- Do not modify test files to make them pass.
- Small commits. One feature per commit, message starts with the feature ID.
