# Web instrument cluster MVP: technical plan

Implements `docs/plan.md` (F-01 to F-13) under the rules in `AGENTS.md`: plain HTML, CSS and JavaScript opened from `file://`, no packages, build or server, drawing only inside `#cluster`.

## Constraints that shape the design
- `file://` blocks `fetch`, ES `import` and Web Workers. So: classic `<script>` tags in `index.html`, one global namespace `window.Cluster`, data from `window.FILES`, everything on the main thread.
- Load order is the dependency order. Each file adds to `Cluster` and uses only what loaded before it.
- `car/` and the page around `#cluster` stay untouched; the only change outside `app/` is the script list in `index.html`. The starter's `app/cluster.js` and the `.starter` rule in `app/cluster.css` go; `tests/app-scripts.js` lists the real files and a test checks `index.html` matches it.

## Modules (`app/`, in load order)

| File | Exposes | Job |
|---|---|---|
| `config.js` | `Cluster.config` | Every colour, size, scale limit, threshold and timing: dial ranges, tick counts, red zone 6500, low fuel 10/12 %, startup timing, needle smoothing. No literals elsewhere (F-01). Views read it when they are built, not when the script loads, so a test can change it before mounting. |
| `lib/csv.js` | `Cluster.parseCsv(text)` | Small CSV parser with quoted fields; returns rows as objects. |
| `signals/spec.js` | `Cluster.loadSignalSpec(text)` | `docs/signals.csv` → map of `{name, type, unit, min, max, rateHz, timeoutMs}` (F-03). |
| `signals/source.js` | `Cluster.assertSource`, `Cluster.realClock` | The **SignalSource** interface: `start()`, `stop()`, `onSignal(cb)` with `cb(name, value)`. The only way signals enter the app (F-02). |
| `signals/replay-source.js` | `Cluster.ReplaySource` | Parses `sim/drive-cycle.csv`, converts types (float, enum, bool), and emits each row at its `t_ms`, looping one step after the last row. Schedules against absolute times from the clock so late timers do not add up. Takes a Clock (below) for tests. |
| `state/store.js` | `Cluster.SignalStore` | Per signal: the last accepted value and when it arrived. Range check against the spec: clamp, `console.warn` once per signal (F-03). Timeout check against the clock (F-04). Override layer that wins over the source until cleared and never times out (F-12). No DOM. |
| `state/derive.js` | `Cluster.derive`, pure functions | km/h → mph and rounding (F-05), rpm → "x.x" and red zone (F-06, from the raw value, not the smoothed needle), gear normalisation to P/R/N/D or "–" (F-07), low-fuel hysteresis (F-08), temperature format (F-09), and the telltale states from a snapshot (F-10). |
| `debug.js` | `Cluster.createDebug(store)` | The console override: `set(name, value)`, `clear(name)`, `clearAll()`, `list()`. Rejects unknown names with `console.error` (F-12). One per mounted app (`app.debug`); `main.js` puts the real page's on `window.clusterDebug`. |
| `view/svg.js` | `Cluster.svg` | Element and attribute helpers (`el`, `set`, `setText`), polar → point, arc paths and lengths, linear and radial gradients. |
| `view/background.js` | `Cluster.createBackground` | The radial glow and the fade to black at the bottom (F-01). |
| `view/dial.js` | `Cluster.createDial(parent, defs, idPrefix, opts)` | One dial component for speed and rpm, with its own gradients: face, track, ticks, red zone, value arc with glow, needle with glow, digits, unit. `update({ fraction, text, red })`; a timed-out signal arrives as fraction 0 and text "--" from derive (F-04–F-06). |
| `view/telltales.js`, `view/gear.js`, `view/fuel.js`, `view/temperature.js` | `createTelltales(parent)`, `createGear(parent)`, `createFuel(parent, defs, idPrefix)`, `createTemperature(parent)` | Inline SVG telltale icons and colours (F-10), gear letters (F-07), fuel bar and amber state (F-08), temperature text (F-09). |
| `startup.js` | `Cluster.Startup` | State machine: bulb check and needle sweep, then "live", on the timing in config (below). While not live, views take targets from it, not the store (F-11). |
| `render.js` | `Cluster.Renderer` | The frame: snapshot the store, derive, write attributes. Driven by `requestAnimationFrame` on the real page, or by `app.frame()` in tests (see Frame budget). |
| `main.js` | `Cluster.mount(root, options)` | Wiring: spec → store → source → the SVG root and `defs` → views (each makes its own gradients, under a per-mount id prefix) → startup → renderer, inside `root`. Mounts into `#cluster` on load unless `window.CLUSTER_NO_AUTOSTART` is set. Keeps `Cluster.apps` (root → app), `Cluster.mounts` and `Cluster.autostarted` on the namespace so a second load of the script shares them. |

`cluster.css` keeps only static styles (font, positioning) scoped under `#cluster`; colours come from config into SVG attributes.

## Public surface
What the tests call; `tests/README.md` has the full contract.
- `Cluster.mount(root, options)` → `app`. Options: `source` (a SignalSource; default a `ReplaySource` of the recording), `clock` (a Clock; default the real one), `manual: true` (no `requestAnimationFrame`; the caller draws with `app.frame()`). `mount` subscribes to the source **before** calling `source.start()`, because sources send their first values inside `start()`. `app`: `frame()`, `destroy()` (stops the source and the loop; safe to call twice), `debug`, `firstLiveAt` (`performance.now()` of the first live frame).
- **Clock:** `{ now(), setTimeout(fn, ms) → id, clearTimeout(id) }`. The real one wraps `performance.now` and `window.setTimeout` in an object (the window functions cannot be called off a plain object).
- `new Startup({ clock })`, one per mount; `startup.state()` → `{ live, telltalesOn, needle }` with `needle` 0..1 during startup and `null` once live.
- `ReplaySource` sends every column of every row, unchanged values included: the row cadence is the heartbeat that keeps constant signals (temperature, gear) from timing out.
- `app.firstLiveAt` is undefined until the first live frame. `window.clusterDebug` is set only by the page's own mount; destroying that app removes it.
- Timing in `config.startup`: telltales on 0–1.5 s; needle up 0–0.7 s, held at 1 until 0.9 s, back at 0 by 1.6 s; live at 1.7 s. The sweep is written to the needles directly, without smoothing. During startup the digits show "0" / "0.0" and gear, fuel and temperature are blank.
- Drawing: needles carry `transform="rotate(a cx cy)"` with a = −135 + 270 × fraction, and `data-fraction` at full precision (the smoothed value as shown). Every element a test reads has a `data-role`, `data-gear` or `data-telltale` attribute; colours are presentation attributes (`fill`, `stroke`) in lower-case hex, not CSS.

## Data flow
```
ReplaySource ──onSignal──▶ SignalStore ◀── app.debug overrides (hold until cleared)
                              │ (range check, timeout)
               frame ▶ Renderer: store.snapshot() ─▶ derive ─▶ views (SVG attributes)
                              ▲
                          Startup (overrides targets until live)
```
The source only writes values into the store; it never touches the DOM. The renderer reads once per frame.

## Rendering
- One inline SVG, `viewBox="0 0 528 692"`, created once. Static parts (faces, tracks, ticks, gradients, icons) are never redrawn.
- Per frame, only: needle `transform: rotate()`, value-arc `stroke-dashoffset` (a fixed-length path), arc colour when the red zone changes, and text nodes when their string changes.
- Glow as in the spec: two wider strokes underneath at 7 % opacity, no SVG filters (filters are costly to repaint).
- Needle smoothing: each frame, displayed += (target − displayed) × (1 − e^(−dt/τ)), τ in config (about 80 ms), so 10 Hz input moves without steps (F-05).

## Threading and frame budget
- One thread. Work outside frames: the CSV parse at load (about 500 rows, a few ms) and replay timers that only store numbers.
- Per frame target under 2 ms of script, inside the 16.7 ms budget: snapshot, derive, write attributes. No layout reads (no `getBoundingClientRect` and similar), so no forced layout.
- Timeouts are checked in the frame from the clock, not with timers.
- Startup: live 1.7 s after mount, so the first live frame is within 2 s of page open with about 0.3 s to spare for loading the page (F-11, F-13).

## Testing approach (input for steps 3 and 4)
- `tests/index.html` loads the same `app/` files plus `tests/runner.js` (a small `describe`/`it`/`expect`) and the test files. It shows results on the page and in `window.testResults`.
- Logic (csv, spec, store, derive, replay with a fake clock, startup) is tested without the DOM. Views are tested by mounting into an off-screen `#cluster` in the test page (attached, so sizes can be measured) and reading SVG attributes.
- `tools/run-tests.sh` runs the page in headless Chrome (`--dump-dom`) and exits non-zero on any failure, so Claude Code can run it.
- `tools/perf-check.sh` opens `tests/perf.html` in headless Chrome in real time (no virtual time); the page mounts the app, counts frames for 10 s and records long tasks with `PerformanceObserver` (F-13). It needs `curl`.

## Risks
- **Gradient along an arc:** SVG has no conic gradient. A linear gradient across the dial approximates `#2F86D6` → `#6DC1EC`; compare with `design/cluster.png` in step 6.
- **Background tabs** slow timers to 1 Hz, so a hidden tab shows timeouts. Expected; the demo keeps the tab in front.
- **Headless frame timing** can differ from a visible window; the perf check may need a tolerance or a run in a visible window.
- **Fonts** differ between macOS and Linux and change digit widths; use tabular figures and a system font stack. The design was drawn in a different face, so its digits are about 12 % narrower than the system font's at the same height.
- **The design image and the spec disagree in two places**: `design/cluster.png` has no fade to black at the bottom (the spec's Visual style table asks for one over 120 px), and it shows a true minus sign on the temperature where the spec and the test contract say an ASCII hyphen. The app follows the spec in both.
- **Load-order bugs** with classic scripts fail silently as `undefined`; `main.js` checks that every module is present and reports what is missing.

## Decisions taken in review
- Overrides hold until cleared and never time out (plan F-12, TC-12-07): a console override that reads "--" after half a second is no use for testing.
- On a timeout the needle moves to 0 with its usual smoothing; only the text changes within a frame (plan F-04, TC-04-01).
- `tests/` and the two scripts in `tools/` are accepted under "no build tools": they need only Chrome and `curl`.

## Open questions
1. Needle smoothing τ of about 80 ms: is a slight lag acceptable, or should the needle follow more tightly? (The tests bound it: under about 100 ms so a timed-out needle reaches 0 within 0.5 s, over about 16 ms so the needle visibly moves between updates.)
2. Should replay pause while the tab is hidden, to avoid timeouts after switching tabs, or is a timeout the honest behaviour?
3. Telltale icons: draw them from `design/cluster.png`, or are there official ISO 2575 shapes to use?
