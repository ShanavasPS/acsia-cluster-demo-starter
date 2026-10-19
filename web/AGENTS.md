# AGENTS.md

Web instrument cluster MVP. Plain HTML, CSS and JavaScript, opened straight from disk: no server, no build step, no packages.

This folder is separate from the Android app in the repo root. The Android `AGENTS.md` above this folder does not apply here: no Gradle, adb or emulator. Work only inside `web/`.

## Commands
- Run: open `index.html` in a browser (`open index.html` on macOS, `xdg-open index.html` on Linux). Reload the page after a change.
- Car modes: `index.html` drives in a loop, `?car=parked` starts parked, `?car=off` has no car (the app replays its recording).
- Screenshot the cluster window only: `index.html?view=cluster` shows it at 528 × 692 with nothing around it.
- After changing a CSV: `tools/bundle-csv.sh` regenerates its `.csv.js`.

## How the page is put together
- `index.html` loads, in order: the data files, the car (`car/`), then the app (`app/`). List every new app file there.
- `car/` is the simulated vehicle and the page around the app. It is not part of the app; do not change it.
- The car: `car.get(name)`, `car.subscribe(name, callback)` (returns unsubscribe), `car.drive()`, `car.park()`, `car.driving`. Signal names and units as in `docs/signals.csv`; speed is km/h.
- Browsers block `fetch` and `import` on `file://`. Use classic scripts that share one namespace object, and read data from `window.FILES["<path>"]`.

## Where things are
- Requirements: `docs/hmi-spec.md`, `docs/signals.csv`
- Plans: `docs/plan.md`, `docs/tech-plan.md`, `docs/test-cases.md`
- Replay data: `sim/drive-cycle.csv`
- Visual reference: `design/cluster.png`

## Rules
- The app draws only inside `#cluster` and scopes all its CSS under `#cluster`.
- Nothing slow on the main thread. Draw in `requestAnimationFrame`.
- Read signals only through one signal-source interface.
- Every signal value is range-checked against `docs/signals.csv` before display.
- No hard-coded limits or colours in drawing code. Put them in one config or theme file.
- No packages, CDNs or build tools. Everything must work offline from `file://`.
- Do not modify test files to make them pass.
- Small commits. One feature per commit, message starts with the feature ID.
