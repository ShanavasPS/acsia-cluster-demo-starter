# Tests

The test cases in `docs/test-cases.md` as runnable tests. Every test is named after its TC ID; "support" tests check a building block a case relies on.

## Run

```sh
tools/run-tests.sh            # all tests, in headless Chrome; exit 0 only if at least one ran and all passed
tools/run-tests.sh TC-08      # only the tests whose name contains TC-08 (plain text, not a pattern)
tools/perf-check.sh           # F-13: frame rate, long tasks, first live frame (about 15 s, real time)
```

Both need Chrome or Chromium (`CHROME=/path/to/the/binary` if it is somewhere unusual; `CHROME_FLAGS="--no-sandbox"` when running as root); `perf-check.sh` also needs `curl`. `TEST_TIMEOUT=60` shortens the watchdog that stops a hung run. `tests/index.html` also runs when opened by hand, but the tests that read files then fail unless Chrome was started with `--allow-file-access-from-files`.

## Files

| File | What |
|---|---|
| `runner.js` | `describe`, `it`, `beforeEach`, `afterEach`, `expect` (`toBe`, `toEqual` (structural, any key order), `toMatchObject` (a subset), `toBeCloseTo`, `toContain`, …); async tests allowed, 5 s each. A test file that fails to load is reported as a failure |
| `helpers.js` | `FakeClock`, `FakeSource`, `createRig` (mounts the app with both), `need`, `spy`, `captureConsole`, `rotationOf`, `dialAngle` |
| `app-scripts.js` | The app's files in load order, for the test pages. A test checks `index.html` lists the same files in the same order |
| `unit/` | Logic without the DOM: CSV, signal spec, replay, store, derived values, startup |
| `ui/` | The mounted app, driven by a fake clock and a fake source, one 16 ms frame at a time |
| `page.test.js` | The real `index.html`, and checks on the app's files |
| `perf.html` | The page `tools/perf-check.sh` measures |

## What the tests expect from the app

The tests fix the interfaces in `docs/tech-plan.md` (its "Public surface" section) and add the detail below. Everything hangs off `window.Cluster`.

**Clock.** `{ now(), setTimeout(fn, ms) → id, clearTimeout(id) }`, in ms. `FakeClock` is one; the app's real one must wrap `performance.now` and `window.setTimeout` in an object, since the window functions cannot be called off a plain object.

**Logic**
- `parseCsv(text)` → array of row objects keyed by the header; quoted fields may hold commas; empty fields are `""`.
- `loadSignalSpec(text)` → `{ [name]: { name, type, unit, min, max, rateHz, timeoutMs, … } }`; numbers as numbers, missing limits as `null`; other keys (such as `description`) are allowed.
- `assertSource(source)` throws unless `source` has `start`, `stop` and `onSignal`.
- `new ReplaySource(csvText, { clock })` is a SignalSource. `start()` sends every signal of the first row at once, then **every column of every row** at its `t_ms` (unchanged values too: the row cadence is the signal heartbeat, or constant signals would time out), and starts again after the last row, one step later (the last row's own step: 49 900 + 100 = 50 000 ms for the recording, whose steps are 99–101 ms). Values are typed: numbers, gear letters, booleans. Scheduled against absolute clock times, so late timers do not add up.
- `new SignalStore(spec, { clock })`: `update(name, value)`, `snapshot()` → `{ [name]: value }` with the timeout already applied. Out-of-range values are clamped with one `console.warn` per signal. A value strictly older than its `timeoutMs` reads `null`; telltales keep their last value; a signal never received reads `null`. Overrides: `setOverride(name, value)` → `true`, or `false` for an unknown name; an override is range-checked, wins over updates, and **holds until cleared** (it never times out; updates keep arriving underneath it); `clearOverride(name)`, `clearOverrides()`.
- `derive`: `kmhToMph`, `speedText`, `speedFraction`, `rpmText`, `rpmFraction`, `isRedZone`, `gear`, `fuelText`, `fuelFraction`, `lowFuel(wasOn, pct)`, `tempText`. Fractions are clamped to 0..1 here (260 km/h → 1). `null` in means timed out: text `"--"`, fraction `0`, `lowFuel` keeps `wasOn`. Text formats: `"24 %"`, `"-2.5 °C"` (ASCII hyphen, normal space), `"3.2"`, `"–"` (en dash) for an unknown gear.
- `new Startup({ clock })`, an instance per mount: `state()` → `{ live, telltalesOn, needle }`. Telltales on until 1.5 s, then off until live; needle 0→1 over 0–0.7 s, 1 until 0.9 s, back to 0 by 1.6 s, 0 until live; live at 1.7 s, then `needle` is `null`.
- `config`: one object with every colour and limit, read by the views when they are built (not captured at script load); `config.colors.track` is the dial ring colour.

**The mounted app**
- `mount(root, options)` draws into `root` and returns the app. With `{ source, clock, manual: true }` it uses those and draws only when `app.frame()` is called; with no options it replays `sim/drive-cycle.csv` on the real clock with `requestAnimationFrame`. It calls `source.onSignal(...)` **before** `source.start()`: sources send their first values inside `start()`.
- `app.frame()` draws one frame at the clock's current time. `app.destroy()` stops the source and the loop and may be called twice. `app.firstLiveAt` is `undefined` until the first live frame, then `performance.now()` of that frame.
- `app.debug` is the console override: `set(name, value)` → `true`, or `false` for an unknown name (with one `console.error` naming it, and nothing changed); `clear(name)`; `clearAll()`; `list()` → array of every signal name. Only the page's own mount (from `main.js`) puts it on `window.clusterDebug`; destroying that app removes it.
- `main.js` mounts into `#cluster` on load, unless `window.CLUSTER_NO_AUTOSTART` is set.
- During startup the texts are: `speed-text` `"0"`, `rpm-text` `"0.0"`, `gear-text`, `fuel-text` and `temperature` empty, no gear letter active, fuel bar at 0; telltales all on until 1.5 s, then off until live. The needles show the sweep directly (no smoothing). Live values appear from 1.7 s.
- Only the two needles are smoothed (τ about 80 ms; the timeout tests need τ under about 100 ms, the smoothness test needs it over about 16 ms). Digits, gear, fuel bar, temperature, telltales and the rpm arc's red state follow the store value on the next frame. On a timeout the needle's target becomes 0 and it gets there with its usual smoothing; it is still clearly off zero on the frame the text turns to "--".
- All content stays inside the middle 348 px: every layout group's box is within x = 90..438 of `#cluster`. The telltale row ends within 10 px above the speed dial's box; the gear group ends within 40 px below it.

**The drawing**, one SVG with `viewBox="0 0 528 692"`, found by data attributes:

| Attribute | Element |
|---|---|
| `data-role="telltales"`, `"speed-dial"`, `"gear"`, `"rpm-dial"`, `"fuel"`, `"temperature"` | Layout groups; `"temperature"` is also the temperature text. The dial groups include the full face, so their boxes are the whole dial |
| `data-role="speed-text"`, `"speed-unit"`, `"rpm-text"`, `"fuel-text"`, `"gear-text"` | Text; while live, `gear-text` shows `–` (unknown) or `--` (timed out) when no letter is active, else empty |
| `data-role="speed-needle"`, `"rpm-needle"` | `transform="rotate(a cx cy)"` with a = −135 + 270 × fraction (0 at the start of the scale, straight up at the middle); `data-fraction`: the needle as shown, 0..1, at full precision |
| `data-role="speed-track"`, `"rpm-track"` | Ring, `stroke` from the theme |
| `data-role="speed-tick"`, `"rpm-tick"` | One `<line>` per tick, and nothing else with these roles |
| `data-role="rpm-arc"` | `data-red="true|false"`; `stroke` red, or a `url(#…)` gradient |
| `data-role="rpm-redzone"` | The red zone mark |
| `data-role="fuel-track"`, `"fuel-bar"` | `<rect>`s; the bar's `width` is the fraction of the track's. The bar has `data-fraction`, `data-low="true|false"`; `fill` amber, or a `url(#…)` gradient |
| `data-gear="P|R|N|D"` | `data-active="true|false"` on all four letters, `fill`, `font-weight` (`bold` or `700` when active) |
| `data-telltale="low_fuel|engine_check|battery|seatbelt|parking_brake"` | `data-state="off|amber|red"`, `fill` |

Colours are compared as lower-case hex. `cluster.css` may use `@media`, `@keyframes` and `@font-face`; every ordinary selector must start with `#cluster`.

## Checked by hand
TC-01-01's "no console errors" on the real page, TC-01-02 (network panel), TC-01-04 (colours against `design/cluster.png`) and TC-13-04 (layout in a performance trace) are visual or need DevTools; the run-in-the-browser step covers them.
