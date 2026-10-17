# Android instrument cluster MVP

An instrument cluster for an Android Automotive OS (AAOS) car. It runs in the car's instrument cluster window, a 528 × 692 portrait screen, and shows speed in mph, a rev counter, gear, fuel, outside temperature and five warning lights, in a dark navy theme.

## Requirements

- `docs/hmi-spec.md`: layout, behaviour, visual style and performance targets.
- `docs/signals.csv`: every vehicle signal with its unit, range, rate and timeout.
- `design/cluster.png`: the visual reference.
- `sim/drive-cycle.csv`: a recorded 50-second drive to replay while there is no vehicle data.

`AGENTS.md` has the commands, the device to use and the rules for working in this repo.

## Build and test

You need the Android SDK and JDK 17.

```sh
./gradlew assembleDebug        # build
./gradlew testDebugUnitTest    # unit and UI tests (JVM)
./gradlew installDebug         # install on the AAOS emulator, emulator-5556
```

## Running it on the emulator

The AAOS emulator, the presenter tools and setup instructions are in the companion repo [acsia-demo-tools](https://github.com/ShanavasPS/acsia-demo-tools).
