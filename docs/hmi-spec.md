# Instrument cluster HMI spec (MVP)

Target: a 1080 × 600 landscape driver display, dark theme, running as an Android app.
Signal names, units and ranges are in `docs/signals.csv`. The visual reference is `design/cluster.png`.

## Layout

- **Left:** speed gauge, 0–260 km/h, 270° arc. Digital speed in the centre, unit "km/h" below it.
- **Right:** rev counter, 0–8000 rpm, 270° arc, red zone from 6500 rpm. Digital value in ×1000 rpm, one decimal.
- **Centre column:** gear indicator (P R N D, the active gear highlighted), fuel bar with percentage, outside temperature.
- **Top strip:** telltales, left to right: low fuel, engine check, battery, seatbelt, parking brake.

## Behaviour

1. **Startup.** On launch all telltales light for 1.5 s (bulb check), the needles sweep to full scale and back, then the cluster shows live values.
2. **Speed.** Needle and digits follow `vehicle_speed`. Display rounds to whole km/h. The needle must move smoothly; no visible stepping at 10 Hz input.
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
