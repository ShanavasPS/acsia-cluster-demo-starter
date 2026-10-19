// The simulated car: the browser stand-in for the AAOS emulator's vehicle HAL.
// It is not part of the cluster app. The app reads it through window.car:
//
//   car.get(name)                  latest value of a signal, or undefined before the first report
//   car.subscribe(name, callback)  callback(value, timestampMs) at the signal's rate; returns unsubscribe
//   car.drive() / car.park()       start the drive loop / stop and park (the page's buttons call these)
//   car.driving                    true while the loop runs
//
// Signal names and units are those in docs/signals.csv (speed in km/h). Each signal is reported at
// its rate_hz, and at once when it changes, so a cluster sees no timeouts while the car is on.
// Each lap: park, pull away, 80 mph, slow to 40 mph, stop. Six laps take fuel from 24 % to 4 %,
// so the low-fuel light comes on in the last laps. Then it repeats. Same as cluster-demo.sh.
//
// index.html?car=off leaves window.car undefined: no vehicle data, so the app has to replay
// sim/drive-cycle.csv by itself (cluster-demo.sh replay on the emulator).
(function () {
  "use strict";
  if (new URLSearchParams(location.search).get("car") === "off") return;

  const TICK_MS = 100;
  const MPH = 1.609344;
  const RATE_HZ = {
    vehicle_speed: 10, engine_rpm: 10, gear: 2, fuel_level_pct: 1, outside_temp_c: 0.2,
    tt_engine_check: 2, tt_battery: 2, tt_seatbelt: 2, tt_parking_brake: 2,
  };
  const PARKED = { vehicle_speed: 0, engine_rpm: 800, gear: "P", tt_parking_brake: true };

  function rpmFor(kmh, accelerating) {
    if (kmh < 1) return 800;
    const shifts = [0, 20, 40, 65, 95, 130, 200];  // gear changes, km/h
    let g = 0;
    while (g < shifts.length - 2 && kmh >= shifts[g + 1]) g++;
    const frac = (kmh - shifts[g]) / (shifts[g + 1] - shifts[g]);
    return Math.round(1500 + frac * (accelerating ? 3200 : 1800));
  }

  // The whole round as one frame per tick: each frame lists only the signals that change.
  function buildRound() {
    const frames = [];
    const hold = (seconds, values) => {
      frames.push(values);
      for (let i = 1; i < seconds * 10; i++) frames.push({});
    };
    const segment = (seconds, v0, v1) => {  // eased, like the emulator loop
      const steps = seconds * 10;
      for (let i = 0; i < steps; i++) {
        const v = v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * i / steps));
        frames.push({ vehicle_speed: +v.toFixed(1), engine_rpm: rpmFor(v, v1 > v0) });
      }
    };
    for (const fuel of [24, 20, 16, 12, 8, 4]) {
      hold(3, { ...PARKED, fuel_level_pct: fuel });
      hold(1, { gear: "D", tt_parking_brake: false });
      segment(14, 0, 80 * MPH); segment(6, 80 * MPH, 80 * MPH);
      segment(6, 80 * MPH, 40 * MPH); segment(5, 40 * MPH, 40 * MPH); segment(8, 40 * MPH, 0);
      hold(2, PARKED);
    }
    return frames;
  }

  const round = buildRound();
  const values = {
    ...PARKED, fuel_level_pct: 24, outside_temp_c: 18,
    tt_engine_check: false, tt_battery: false, tt_seatbelt: false,
  };
  const listeners = {};   // name -> Set of callbacks
  const lastSent = {};    // name -> time of the last report
  let frame = 0;
  let driving = false;

  function report(name, now) {
    lastSent[name] = now;
    for (const cb of listeners[name] || []) {
      try { cb(values[name], now); } catch (e) { console.error(e); }
    }
  }

  function set(changes, now) {
    for (const [name, value] of Object.entries(changes)) {
      if (values[name] === value) continue;
      values[name] = value;
      report(name, now);
    }
  }

  setInterval(() => {
    const now = Date.now();
    if (driving) { set(round[frame], now); frame = (frame + 1) % round.length; }
    for (const name in RATE_HZ) {
      if (now - (lastSent[name] || 0) >= 1000 / RATE_HZ[name] - TICK_MS / 2) report(name, now);
    }
  }, TICK_MS);

  const car = {
    get: (name) => values[name],
    subscribe(name, callback) {
      if (!(name in RATE_HZ)) throw new Error("Unknown signal: " + name);
      (listeners[name] = listeners[name] || new Set()).add(callback);
      return () => listeners[name].delete(callback);
    },
    drive() { if (!driving) { driving = true; frame = 0; } },
    park() { driving = false; set(PARKED, Date.now()); },
    get driving() { return driving; },
  };
  window.car = car;
})();
