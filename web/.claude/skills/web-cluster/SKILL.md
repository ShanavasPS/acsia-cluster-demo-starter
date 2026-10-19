---
name: web-cluster
description: Open or inspect the browser version of the Acsia instrument cluster demo, which needs nothing installed. Use when asked to start or open the web cluster, show the cluster in the browser, run it parked or without a car, or screenshot it. Not for the Android emulator; that is aaos-cluster.
---

# Web cluster

The browser version of the cluster demo. The app is this `web/` folder: plain HTML, CSS and JavaScript, opened straight from disk (`file://`). It needs no SDK, emulator, server, packages or network, only a browser, on macOS or Linux.

## Scripts

All in `scripts/` next to this file. Run them from anywhere.

| Task | Command | Notes |
|---|---|---|
| Open the cluster | `scripts/start.sh` | Opens `index.html` in the default browser. The car drives in a loop. |
| Open it parked | `scripts/start.sh parked` | The car waits in P; Drive below the window starts the loop. |
| Open it without a car | `scripts/start.sh off` | `window.car` is absent. For the MVP the app replays `sim/drive-cycle.csv` in every mode; this mode matters once it reads the car (the later live-data step). |
| Screenshot | `scripts/screenshot.sh [out.png] [seconds]` | The cluster window alone, 528 × 692, a few seconds into the drive, with headless Chrome. Needs Chrome or Chromium. |

There is nothing to stop: closing the tab ends it. After the app changes, reload the tab or run `start.sh` again.

To check what the cluster shows, save a screenshot in the scratchpad directory and look at it:

```sh
scripts/screenshot.sh <scratchpad>/cluster.png
```

## How it fits together

| What | Where |
|---|---|
| The page | `index.html`: the cluster window (`#cluster`, 528 × 692) and the car's controls below it |
| The simulated car | `car/car.js`, as `window.car`: `get(name)`, `subscribe(name, callback)`, `drive()`, `park()`, `driving`. Signals as in `docs/signals.csv`, speed in km/h, each at its rate. Same laps as `cluster-demo.sh` |
| The app | `app/`: at the start it only draws "Cluster" on black, like the Android starter; the demo builds the cluster here |
| Data files | `docs/signals.csv` and `sim/drive-cycle.csv`, also bundled as `.csv.js` into `window.FILES`. After changing a CSV run `tools/bundle-csv.sh` |
| URL options | `?car=parked`, `?car=off`, `?view=cluster` (the window alone, for screenshots) |

The repo's `AGENTS.md` and `docs/hmi-spec.md` are the rules and requirements for building the cluster.

## Traps

- **`fetch` and `import` fail on `file://`.** Browsers block them, so the app uses classic `<script>` tags listed in `index.html` and reads data from `window.FILES`. A new CSV needs `tools/bundle-csv.sh`.
- **Opening a `file://` URL drops its query**, with `open`, `osascript` and `xdg-open` alike, so `?car=parked` would be lost. `start.sh` opens a small launcher page (in `$TMPDIR/web-cluster/`) that redirects to the full URL.
- **The car's own readout is the truth.** The line beside Park and Drive shows what the car reports, whatever the cluster shows, like the Android cluster strip.
- **Background tabs slow timers to once a second**, so a hidden tab can show signal timeouts. Keep the tab in front during the demo.
- **Don't change `car/`** when building the cluster. It plays the part of the vehicle.
