# Web instrument cluster MVP: plan

A cluster in a 528 × 692 px portrait window in the browser (`index.html`, `#cluster`), plain HTML, CSS and JavaScript opened from disk. Requirements: `docs/hmi-spec.md`, `docs/signals.csv`; visual reference `design/cluster.png`.

## Scope decisions
- Signals come from replaying `sim/drive-cycle.csv`, behind a signal-source interface. The simulated car (`window.car`) is not used yet.
- Speed in mph only. Acceptance is checked in current Chrome; Safari and Firefox are best effort (the spec's "must run in" is relaxed to this for the MVP).
- Startup sequence and a console override for tests are in.
- 60 fps and time to first frame are measured by an automated check.

## Features

**F-01 Cluster window and theme**
- Draws only inside `#cluster`, at 528 × 692 design px, with all content inside the middle 348 px (x = 90..438), as the Android cluster window needs; all CSS scoped under `#cluster`.
- Layout as in the spec: telltale row on top, speed dial in the middle with gear below it, rev counter lower left, fuel and temperature lower right.
- Colours, sizes and limits live in one theme/config file.
- Acceptance: opening `index.html` from disk shows the layout with no console errors; no network requests; no `import` or `fetch`; changing a colour in the theme file changes it everywhere; a screenshot matches `design/cluster.png` in layout and colours.

**F-02 Replay signal source**
- Parses `window.FILES["sim/drive-cycle.csv"]` and replays it in a loop at its recorded timing.
- The app reads signals only through the signal-source interface.
- Acceptance: values change in step with `t_ms`; after the last row it starts again from the first without a gap or jump in time; swapping in another source needs no change to the drawing code.

**F-03 Signal limits and range check**
- Limits, rates and timeouts come from `window.FILES["docs/signals.csv"]`.
- Out-of-range values are clamped for display and logged once per signal as a console warning.
- Acceptance: speed 300 km/h shows the needle at the end of the scale and logs one warning, however many times it repeats; a value back in range displays normally.

**F-04 Signal timeout**
- A signal not updated within its `timeout_ms` shows "--" and its needle drops to zero; telltales keep their last state.
- Acceptance: stop updates to speed → "--" after 500 ms (± one frame) and the needle moves to 0 with its usual smoothing (within a further 0.5 s); updates resume → value returns; a stopped telltale keeps its state.

**F-05 Speed gauge**
- 0–160 mph, 270° arc, about 330 px, 9 ticks every 20 mph, no minor ticks; value arc with gradient and glow; short needle inside the ring.
- Digital speed in whole mph with "mph" below; km/h converted with 1 mph = 1.609344 km/h.
- Acceptance: 0, 64.4, 128.7 and 257.5 km/h show 0, 40, 80 and 160 mph; above 160 mph the needle stays at the end; the needle moves smoothly between 10 Hz updates (interpolated, no visible steps).

**F-06 Rev counter**
- 0–8000 rpm, 270° arc, about 190 px, 17 equal ticks every 500 rpm, red zone from 6500 rpm.
- Digital value in ×1000 rpm, one decimal.
- Acceptance: 3236 rpm shows "3.2"; above 6500 rpm the value arc turns red; below it returns to the gradient.

**F-07 Gear indicator**
- P R N D in the open bottom of the speed dial; the active gear bold in `#6DC1EC`, the others `#4D6C96`.
- Acceptance: each of P, R, N, D highlights only that letter; an unknown value shows "–".

**F-08 Fuel and low-fuel warning**
- Fuel bar and percentage; the bar uses the value-arc gradient, or flat amber when low fuel is on.
- Low-fuel telltale on in amber at or below 10 %, within 1 s; off above 12 %.
- Acceptance: 8 % → telltale amber within 1 s and bar amber; 11 % after being low → stays on; 12.5 % → off.

**F-09 Outside temperature**
- Shows `outside_temp_c` with one decimal and "°C".
- Acceptance: -2.5 shows "-2.5 °C"; after 10 s without updates it shows "--".

**F-10 Telltales**
- Five inline SVG icons left to right: low fuel, engine check, battery, seatbelt, parking brake.
- Off `#2C4266`; on amber `#F2B43C` (low fuel, engine check) or red `#E2574C` (battery, seatbelt, parking brake).
- Acceptance: each telltale follows its signal (low fuel follows F-08) in the right colour; the order matches the design.

**F-11 Startup sequence**
- On page load all telltales light for 1.5 s, the needles sweep to full scale and back, then live values show. The sweep runs alongside the bulb check; the cluster is live 1.7 s after it starts.
- During startup the digits show "0" and "0.0", gear, fuel and temperature are blank, and no gear letter is highlighted.
- Acceptance: telltales all on for 1.5 s (± 100 ms); both needles reach full scale and are back at 0 before the cluster goes live; live values from 1.7 s; no live value and no "--" during startup.

**F-12 Console override for tests**
- From the browser console a tester can set any signal, clear one override, or clear all; an override beats the replay until it is cleared.
- Overridden values go through the same range check as real ones. An override does not time out: it holds until cleared (a tester cannot re-send it ten times a second). The replay keeps updating underneath, so clearing an override shows the replay's current value.
- Acceptance: setting `fuel_level_pct` to 8 turns the low-fuel telltale amber within 1 s and it stays until cleared; clearing it restores the replay value; an unknown signal name is refused with a console error.

**F-13 Performance**
- Drawing in `requestAnimationFrame`; no long tasks during the drive.
- Acceptance: a headless Chrome check over 10 s of drive measures at least 55 fps on average and no long task over 50 ms; first live frame within 2 s of page open. (The spec says 60 fps and no dropped frames; these are the tolerances the automated check applies. The Long Tasks API only reports tasks over 50 ms.)

## Non-goals for this MVP
- Live vehicle data from `window.car` (an optional later step).
- km/h display or a unit switch.
- Acceptance checks in Safari or Firefox.
- Other window sizes or a responsive layout (the page scales the window; the app always lays out at 528 × 692).
- Infotainment, navigation, turn indicators, odometer, trip or range.
- Sounds or chimes, day/night themes, settings, translations.
- Packages, build tools, a server or network access.
- Changes to `car/` or the page around `#cluster`.
