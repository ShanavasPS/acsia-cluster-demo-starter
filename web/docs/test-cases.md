# Web instrument cluster MVP: test cases

Every acceptance criterion in `docs/plan.md` as Given, When, Then, plus edge cases for limits, timeouts and startup. Each case is linked to its feature: `TC-05-02` is the second case for F-05.

Conventions:
- "The cluster is live" means the page is open in Chrome, the startup sequence has finished and signals are arriving.
- "Set X to v" means a test signal source sends that value (the automated tests mount the app with one, in place of the replay); by hand, the console override (F-12) does the same, except for the timeout cases, since an override never times out. The recorded drive never goes near the limits, low fuel, gears R or N, or a battery fault, so those cases need a test source or the override.
- Times allow one frame (about 17 ms) unless a case says otherwise.
- Speed arrives in km/h; the cluster shows mph (1 mph = 1.609344 km/h).

## F-01 Cluster window and theme

**TC-01-01 Opens from disk without errors**
Given `index.html` opened from disk (`file://`) in Chrome
When the page has loaded
Then the cluster shows inside the 528 × 692 window, and the console has no errors.

**TC-01-02 No network, modules or fetch**
Given the page opened from disk with the network panel recording
When the cluster has run for 10 s
Then no network request was made, and no app file uses `import` or `fetch`.

**TC-01-03 Layout matches the spec**
Given the cluster is live
When a screenshot of the window is taken
Then the telltale row is at the top, the speed dial in the middle with the gear letters in its open bottom, the rev counter lower left, and fuel and temperature lower right, as in `design/cluster.png`.

**TC-01-04 Colours match the design**
Given the cluster is live
When the screenshot is compared with `design/cluster.png`
Then background, rings, ticks, arcs, needles, digits, labels and telltales use the colours in the spec's Visual style table.

**TC-01-05 One theme file**
Given the dial ring colour is changed in the theme file only
When the page is reloaded
Then both dials show the new ring colour, and no other file had to change.

**TC-01-06 Styles stay inside the cluster**
Given the cluster is live
When the page around it is inspected
Then the car's controls and readout below the window look as they do with the starter app.

**TC-01-07 Content stays inside the middle 348 px**
Given the cluster is live
When the position of every layout group (telltales, speed dial, gear, rev counter, fuel, temperature) is measured
Then each lies within x = 90..438 of the window.

## F-02 Replay signal source

**TC-02-01 Replay follows the recorded timing**
Given the cluster is live
When 5 s pass after the replay starts
Then the values shown are those of the row near `t_ms` 5000 in `sim/drive-cycle.csv`.

**TC-02-02 Replay loops without a gap**
Given the replay is at the last row (`t_ms` 49900)
When 100 ms pass (one step, as between any two rows)
Then the first row's values show at 50000 ms, with no timeout shown and no pause; no gap anywhere in the loop is longer than the recording's own longest step (101 ms).

**TC-02-03 Loop does not drift**
Given the replay has looped 3 times
When the row at `t_ms` 0 shows again
Then it shows within 100 ms of 3 × 50 s after the start.

**TC-02-04 Another source can replace the replay**
Given a test source that sends speed 80 km/h, used instead of the replay
When the cluster is live
Then the speed dial shows 50 mph, with no change to any drawing code.

## F-03 Signal limits and range check

**TC-03-01 Limits come from signals.csv**
Given the cluster is live
When its limits are compared with `docs/signals.csv`
Then each signal's min, max and timeout match the file.

**TC-03-02 Speed above the maximum is clamped**
Given the cluster is live
When speed is set to 300 km/h
Then the needle stays at the end of the scale, the digits show 162 mph (260 km/h, the maximum), and one warning is logged.

**TC-03-03 Warning logged only once**
Given speed has been set to 300 km/h once
When it is set to 300 km/h 20 more times
Then no further warning is logged.

**TC-03-04 Back in range displays normally**
Given speed is clamped at 300 km/h
When speed is set to 64.4 km/h
Then the dial shows 40 mph.

**TC-03-05 Below the minimum is clamped**
Given the cluster is live
When outside temperature is set to -50 °C
Then it shows "-40.0 °C" and one warning is logged.

**TC-03-06 Every numeric signal is checked** (edge)
Given the cluster is live
When rpm is set to 9000, fuel to 120 and temperature to 61
Then rpm shows "8.0", fuel 100 % and temperature "60.0 °C", with one warning for each signal.

**TC-03-07 Values exactly at the limits are not warnings** (edge)
Given the cluster is live
When speed is set to 0 and then 260 km/h
Then both display without any warning.

## F-04 Signal timeout

**TC-04-01 Speed times out**
Given the cluster is live
When speed stops updating
Then after 500 ms, and not before, the digits show "--"; the needle moves to 0 with its usual smoothing, reaching it within a further 0.5 s.

**TC-04-02 Speed comes back**
Given speed has timed out
When speed updates again with 64.4 km/h
Then the dial shows 40 mph.

**TC-04-03 Telltales keep their last state**
Given the parking brake telltale is on
When the parking brake signal stops updating for 2 s
Then the telltale stays on.

**TC-04-04 Each signal uses its own timeout** (edge)
Given the cluster is live
When all signals stop updating at once
Then speed and rpm show "--" after 500 ms, gear after 1000 ms, fuel after 3000 ms, and temperature after 10000 ms.

**TC-04-05 Rpm times out** (edge)
Given the cluster is live
When rpm stops updating
Then after 500 ms the rpm digits show "--" and its needle drops to 0.

**TC-04-06 Fuel times out** (edge)
Given fuel is 24 %
When fuel stops updating
Then after 3000 ms the percentage shows "--" and the bar is empty, and the low-fuel telltale keeps its state.

**TC-04-07 One signal timing out leaves the others** (edge)
Given the cluster is live
When only speed stops updating
Then rpm, gear, fuel and temperature keep showing live values.

## F-05 Speed gauge

**TC-05-01 Converts km/h to mph**
Given the cluster is live
When speed is set to 0, 64.4, 128.7 and 257.5 km/h in turn
Then the digits show 0, 40, 80 and 160 mph.

**TC-05-02 Rounds to whole mph** (edge)
Given the cluster is live
When speed is set to 0.8 km/h and then 1.6 km/h
Then the digits show 0 and then 1.

**TC-05-03 Needle stops at the end of the scale**
Given the cluster is live
When speed is set to 260 km/h (162 mph)
Then the needle stays at the 160 mph end, and the digits show 162.

**TC-05-04 Needle position**
Given the cluster is live
When speed is set to 128.7 km/h (80 mph)
Then the needle points at the middle of the 270° arc, at the 80 mph tick.

**TC-05-05 Needle moves smoothly**
Given speed rises 5 km/h every 100 ms
When the needle is sampled every frame for 1 s
Then it never moves backwards, no jump is bigger than the change in one update, and it moves on at least 70 % of the frames (an unsmoothed needle moves on one frame in seven).

**TC-05-06 Dial details**
Given the cluster is live
When the speed dial is inspected
Then it has 9 ticks, every 20 mph, no minor ticks, and "mph" below the digits.

## F-06 Rev counter

**TC-06-01 Shows ×1000 rpm with one decimal**
Given the cluster is live
When rpm is set to 3236
Then the digits show "3.2".

**TC-06-02 Red above 6500**
Given the cluster is live
When rpm is set to 6501
Then the value arc turns red.

**TC-06-03 Back below the red zone**
Given rpm is 7000 and the arc is red
When rpm is set to 4000
Then the arc shows the blue gradient again.

**TC-06-04 Exactly 6500 is not red** (edge)
Given the cluster is live
When rpm is set to 6500
Then the arc is not red.

**TC-06-05 Zero and full scale** (edge)
Given the cluster is live
When rpm is set to 0 and then 8000
Then the digits show "0.0" and then "8.0", with the needle at the start and then the end of the scale.

**TC-06-06 Dial details**
Given the cluster is live
When the rev counter is inspected
Then it has 17 ticks of equal length, every 500 rpm, with the red zone marked from 6500.

## F-07 Gear indicator

**TC-07-01 Each gear highlights its letter**
Given the cluster is live
When gear is set to P, R, N and D in turn
Then only that letter is bold in `#6DC1EC`, and the others are `#4D6C96`.

**TC-07-02 Unknown gear**
Given the cluster is live
When gear is set to "X"
Then the indicator shows "–" and no letter is highlighted.

**TC-07-03 Gear follows the replay**
Given the cluster is live
When the replay moves from P to D
Then the highlight moves from P to D within one frame of the update.

**TC-07-04 Gear times out** (edge)
Given the cluster is live
When gear stops updating for 1000 ms
Then the indicator shows "--" and no letter is highlighted.

## F-08 Fuel and low-fuel warning

**TC-08-01 Fuel bar and percentage**
Given the cluster is live
When fuel is set to 24 %
Then the percentage shows "24 %", the bar is a quarter full, and it uses the blue gradient.

**TC-08-02 Low fuel turns on**
Given fuel is 24 %
When fuel is set to 8 %
Then within 1 s the low-fuel telltale is amber and the bar is flat amber.

**TC-08-03 Stays on between 10 and 12 %**
Given the low-fuel telltale is on
When fuel is set to 11 %
Then the telltale stays on.

**TC-08-04 Turns off above 12 %**
Given the low-fuel telltale is on
When fuel is set to 12.5 %
Then the telltale turns off and the bar returns to the gradient.

**TC-08-05 Exactly 10 % turns it on** (edge)
Given fuel is 24 %
When fuel is set to 10 %
Then the low-fuel telltale turns on.

**TC-08-06 Exactly 12 % keeps it on** (edge)
Given the low-fuel telltale is on
When fuel is set to 12 %
Then the telltale stays on.

**TC-08-07 Rising to 11 % from above does not turn it on** (edge)
Given fuel is 24 % and the telltale is off
When fuel is set to 11 %
Then the telltale stays off.

**TC-08-08 Empty and full** (edge)
Given the cluster is live
When fuel is set to 0 % and then 100 %
Then the bar is empty and then full, with "0 %" and "100 %".

## F-09 Outside temperature

**TC-09-01 One decimal and °C**
Given the cluster is live
When temperature is set to -2.5
Then it shows "-2.5 °C".

**TC-09-02 Whole numbers keep the decimal** (edge)
Given the cluster is live
When temperature is set to 18
Then it shows "18.0 °C".

**TC-09-03 Temperature times out**
Given the cluster is live
When temperature stops updating
Then after 10 s it shows "--", and not before.

## F-10 Telltales

**TC-10-01 Order**
Given the cluster is live
When the telltale row is inspected
Then from left to right it shows low fuel, engine check, battery, seatbelt, parking brake.

**TC-10-02 Off colour**
Given all telltale signals are off and fuel is above 12 %
When the row is inspected
Then all five icons are `#2C4266`.

**TC-10-03 Amber telltales**
Given the cluster is live
When engine check is set on
Then its icon is amber `#F2B43C`.

**TC-10-04 Red telltales**
Given the cluster is live
When battery, seatbelt and parking brake are set on
Then each icon is red `#E2574C`.

**TC-10-05 Telltales follow the replay**
Given the cluster is live
When the replay releases the parking brake as it moves to D
Then the parking brake icon turns off within one frame of the update.

**TC-10-06 Each telltale is independent** (edge)
Given the cluster is live
When only the seatbelt signal is set on
Then only the seatbelt icon lights.

## F-11 Startup sequence

**TC-11-01 Bulb check**
Given the page is opened
When the cluster first appears
Then all five telltales are on, in their on colours, for 1.5 s (± 100 ms).

**TC-11-02 Needle sweep**
Given the bulb check has started
When the sweep runs
Then both needles move to full scale, hold there briefly, and are back at zero by 1.6 s, before the cluster goes live (the test checks at 1.7 s).

**TC-11-03 No live values during startup**
Given the replay is sending values from the start (say 64.4 km/h in D)
When the startup sequence runs (the first 1.7 s)
Then the speed digits show "0", the rpm digits "0.0", gear, fuel and temperature are blank, and no gear letter is highlighted.

**TC-11-04 Live values afterwards**
Given the startup sequence has finished (1.7 s)
When the next frame draws
Then the dials, gear, fuel, temperature and telltales show live values.

**TC-11-05 No timeouts shown during startup** (edge)
Given a signal that only starts updating 1 s after the page opens
When the startup sequence runs
Then no "--" shows during startup.

**TC-11-06 Runs again on reload** (edge)
Given the cluster is live
When the page is reloaded
Then the bulb check and sweep run again.

## F-12 Console override for tests

**TC-12-01 Override a signal**
Given the cluster is live
When `fuel_level_pct` is set to 8 from the console
Then within 1 s the low-fuel telltale is amber.

**TC-12-02 Override beats the replay**
Given speed is overridden to 64.4 km/h, once
When the replay sends other speeds for 5 s
Then the dial keeps showing 40 mph.

**TC-12-03 Clear one override**
Given fuel is overridden to 8 %
When that override is cleared
Then fuel shows the replay value again, and other overrides stay.

**TC-12-04 Clear all overrides**
Given speed and fuel are overridden
When all overrides are cleared
Then both show replay values again.

**TC-12-05 Unknown signal refused**
Given the cluster is live
When an override is set for "turbo_boost"
Then a console error names the signal, and nothing changes on the cluster.

**TC-12-06 Overrides are range-checked** (edge)
Given the cluster is live
When speed is overridden to 300 km/h
Then it is clamped as in TC-03-02, with one warning.

**TC-12-07 Overrides do not time out** (edge)
Given fuel is overridden to 8 % once and not set again
When 30 s pass
Then fuel still shows "8 %" and the low-fuel telltale is amber; clearing the override shows the replay's current fuel level and turns the telltale off.

## F-13 Performance

**TC-13-01 Frame rate**
Given the cluster is live in headless Chrome
When 10 s of the drive are measured
Then the average is at least 55 frames per second.

**TC-13-02 No long tasks**
Given the same 10 s measurement
When long tasks are recorded
Then none is longer than 50 ms.

**TC-13-03 Time to first live frame**
Given the page is opened
When the first frame with live values draws
Then it is within 2 s of the page opening.

**TC-13-04 No layout work per frame** (edge)
Given a 5 s performance trace of the live cluster
When the frames are inspected
Then no frame forces a layout from script.
