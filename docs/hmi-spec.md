# Instrument cluster HMI spec (MVP)

Target: the **instrument cluster window** of an Android Automotive OS (AAOS) car, a 528 × 692 px portrait window, dark theme.
Signal names, units and ranges are in `docs/signals.csv`. The visual reference is `design/cluster.png`.

## Where it runs

- The car's cluster service shows our activity in the cluster window (fixed activity mode). The activity must be allowed while driving (distraction optimized), because the cluster is always visible.
- The cluster OS draws over about 90 px on the left and right edges of the window, and draws its own status strip below it. Keep all content inside the middle 348 px.
- The same activity must also run as a normal app on the main display, for automated end-to-end tests. There it shows the same layout, scaled to fit and centred.

## Layout (528 × 692 design px)

- **Top:** telltales in one row, left to right: low fuel, engine check, battery, seatbelt, parking brake.
- **Main dial:** speed gauge, 0–160 mph, 270° arc, about 330 px across. Digital speed in the centre, unit "mph" below it. Gear indicator (P R N D, the active gear highlighted) in the open bottom of the dial.
- **Lower left:** rev counter, 0–8000 rpm, 270° arc, about 190 px across, red zone from 6500 rpm. Digital value in ×1000 rpm, one decimal.
- **Lower right:** fuel bar with percentage, outside temperature below it.
- **Needles** are short pointers on the outer ring, so they never cross the digits.

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

For the MVP, signals come from replaying `sim/drive-cycle.csv` in a loop at its recorded timing. The source must sit behind an interface so a vehicle source (CarPropertyManager) can replace it later.

Debug builds must let a tester override any signal from the command line (adb), for automated tests.

## Performance

- 60 fps on the emulator during the drive cycle. No dropped frames from work on the main thread.
- Cold start to first live frame under 2 s.
