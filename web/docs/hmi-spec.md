# Instrument cluster HMI spec (MVP)

Target: the **instrument cluster window** of a car, a 528 × 692 px portrait window, dark navy theme (see Visual style). Here the car is simulated in a web browser.
Signal names, units and ranges are in `docs/signals.csv`. The visual reference is `design/cluster.png`.

## Where it runs

- `index.html` is the car: it shows the cluster window (`#cluster`, 528 × 692 px) and simulates the vehicle. The app draws only inside `#cluster`, and its styles must not reach outside it.
- The page is opened straight from disk (`file://`), with no server, build step or packages. So the app is plain HTML, CSS and JavaScript in classic `<script>` tags: no `import`, no `fetch`. Data files are read from `window.FILES` (see Signal source).
- It must run in current Chrome, Safari and Firefox. The page may scale the window to fit the browser; the app always lays out at 528 × 692.

## Layout (528 × 692 design px)

- **Top:** telltales in one row, left to right: low fuel, engine check, battery, seatbelt, parking brake.
- **Main dial:** speed gauge, 0–160 mph, 270° arc, about 330 px across. One tick every 20 mph (9 ticks), no minor ticks. Digital speed in the centre, unit "mph" below it. Gear indicator (P R N D, the active gear highlighted) in the open bottom of the dial.
- **Lower left:** rev counter, 0–8000 rpm, 270° arc, about 190 px across, red zone from 6500 rpm. One tick every 500 rpm (17 ticks), all the same length. Digital value in ×1000 rpm, one decimal.
- **Lower right:** fuel bar with percentage, outside temperature below it.
- **Ticks** are short and sit just inside the ring.
- **Needles** are short pointers just inside the ring, not on it: each runs inwards from over the ticks, and stops well short of the digits.

## Visual style

Dark navy, in the Acsia palette. `design/cluster.png` shows all of it; the values are:

| Element | Look |
|---|---|
| Background | Radial glow: `#18304F` in the centre fading to `#0A1424` at the edges. Over the bottom 120 px it fades on to black `#000000`, so it meets the cluster OS strip below the window without an edge |
| Dial face | Inside each ring, `#10203A` in the centre fading to transparent at the ring |
| Dial ring (track) | `#1B2C48` |
| Ticks | `#4D6C96` |
| Value arc | Gradient from `#2F86D6` at the start of the scale to `#6DC1EC`, with a soft glow: two wider strokes underneath (2× and 3.2× the ring width) in the arc colour at 7 % opacity |
| Needle | `#F7F9FC`, with the same soft glow in `#6DC1EC` |
| Red zone and red value arc | `#E2574C` |
| Digits | `#F7F9FC` |
| Labels (mph, ×1000 rpm, fuel, temperature) | `#8FB3D9` |
| Gear letters | Inactive `#4D6C96`; active `#6DC1EC`, bold |
| Fuel bar | Track `#1B2C48`; fill uses the value-arc gradient, or flat amber when low fuel is on |
| Telltales | Off `#2C4266`; amber `#F2B43C` (low fuel, engine check); red `#E2574C` (battery, seatbelt, parking brake) |

## Behaviour

1. **Startup.** On launch all telltales light for 1.5 s (bulb check), the needles sweep to full scale and back, then the cluster shows live values.
2. **Speed.** Needle and digits follow `vehicle_speed`. The signal is in km/h; the cluster shows mph (1 mph = 1.609344 km/h). Display rounds to whole mph. Above 160 mph the needle stays at the end of the scale. The needle must move smoothly; no visible stepping at 10 Hz input.
3. **RPM.** Needle follows `engine_rpm`. The arc turns red above 6500 rpm.
4. **Gear.** Shows `gear`. Unknown values show "–".
5. **Fuel.** Bar and percentage follow `fuel_level_pct`. At or below 10 % the low-fuel telltale turns on in **amber** within 1 s. It turns off above 12 % (hysteresis).
6. **Telltales.** Each telltale follows its boolean signal. Colours: amber for low fuel and engine check, red for battery, seatbelt and parking brake.
7. **Signal timeout.** If a signal is not updated within its `timeout_ms`, its value shows "--" and the needle drops to zero. Telltales keep their last state.
8. **Out of range.** Values outside the min/max in `signals.csv` are clamped for display and logged once as a warning.

## Signal source

For the MVP, signals come from replaying `sim/drive-cycle.csv` in a loop at its recorded timing. Its text is in `window.FILES["sim/drive-cycle.csv"]`, and `docs/signals.csv` is in `window.FILES["docs/signals.csv"]`. The source must sit behind an interface so a vehicle source (the simulated car, `window.car`) can replace it later.

The app must let a tester override any signal from the browser console, for automated tests.

## Performance

- 60 fps in the browser during the drive cycle. Animate with `requestAnimationFrame`; no long tasks that drop frames.
- Page open to first live frame under 2 s.
