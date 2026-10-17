# AGENTS.md

Android instrument cluster MVP. Kotlin, Jetpack Compose, single `app` module.

## Commands
- Build: `./gradlew assembleDebug`
- Unit tests (JVM, includes Robolectric Compose tests): `./gradlew testDebugUnitTest`
- Install: `./gradlew installDebug`
- Device: the cluster emulator is `emulator-5556`. Always set `ANDROID_SERIAL=emulator-5556` for adb, Gradle installs and Maestro (`maestro --device emulator-5556`). Never touch other devices.

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
