// F-02: the replay source plays sim/drive-cycle.csv in a loop at its recorded timing.
describe("Replay source", () => {
  const DRIVE = () => window.FILES["sim/drive-cycle.csv"];
  // The recording, parsed here without the app's parser, for expected values.
  const rows = () => DRIVE().trim().split("\n").slice(1).map((line) => {
    const c = line.split(",");
    return { t: +c[0], speed: +c[1], rpm: +c[2], gear: c[3], fuel: +c[4], temp: +c[5],
      engine: c[6] === "1", battery: c[7] === "1", seatbelt: c[8] === "1", brake: c[9] === "1" };
  });

  function startReplay(clock) {
    const ReplaySource = need("ReplaySource");
    const source = new ReplaySource(DRIVE(), { clock });
    const latest = {};
    const log = [];   // [time, name, value]
    source.onSignal((name, value) => { latest[name] = value; log.push([clock.now(), name, value]); });
    source.start();
    return { source, latest, log };
  }

  it("TC-02-01 shows the row recorded at 5 s after 5 s", () => {
    const clock = new FakeClock();
    const { latest } = startReplay(clock);
    clock.advance(5000);
    // The recording has no row at exactly 5000 ms (it steps 99..101 ms); the row in force is the last one at or before it.
    const row = rows().filter((r) => r.t <= 5000).pop();
    expect(latest.vehicle_speed).toBe(row.speed);
    expect(latest.engine_rpm).toBe(row.rpm);
    expect(latest.gear).toBe(row.gear);
    expect(latest.fuel_level_pct).toBe(row.fuel);
    expect(latest.tt_parking_brake).toBe(row.brake);
  });

  it("TC-02-01 sends typed values: numbers, gear letters and booleans", () => {
    const clock = new FakeClock();
    const { latest } = startReplay(clock);
    expect(latest.vehicle_speed).toBe(0);
    expect(latest.gear).toBe("P");
    expect(latest.tt_seatbelt).toBe(true);
    expect(latest.tt_battery).toBe(false);
    expect(latest.outside_temp_c).toBe(-3);
  });

  it("TC-02-02 loops from the last row to the first without a gap", () => {
    const clock = new FakeClock();
    const { latest, log } = startReplay(clock);
    clock.advance(50050);
    // The first row plays again one step after the last row (49900 + 100 = 50000 ms).
    const firstRowAgain = log.find(([t, name, v]) => t > 49900 && name === "outside_temp_c" && v === -3);
    expect(firstRowAgain && firstRowAgain[0]).toBe(50000);
    expect(latest.tt_engine_check).toBe(true);    // only the first rows have the engine check on
    // And no gap anywhere is longer than the recording's own longest step (101 ms).
    const all = rows();
    const longestStep = Math.max(...all.slice(1).map((r, i) => r.t - all[i].t));
    const times = log.filter(([, name]) => name === "vehicle_speed").map(([t]) => t);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(longestStep);
  });

  it("TC-02-03 does not drift over three loops, even when timers fire late", () => {
    const clock = new FakeClock({ lateness: 7 });
    const { log } = startReplay(clock);
    clock.advance(150050);
    const firstRowTimes = log.filter(([, name, v]) => name === "outside_temp_c" && v === -3).map(([t]) => t);
    const fourth = firstRowTimes.find((t) => t > 140000);
    expect(fourth).toBeGreaterThanOrEqual(150000 - 100);
    expect(fourth).toBeLessThanOrEqual(150000 + 100);
  });

  it("TC-02-01 support: stop() ends the replay", () => {
    const clock = new FakeClock();
    const { source, log } = startReplay(clock);
    clock.advance(1000);
    source.stop();
    const count = log.length;
    clock.advance(5000);
    expect(log.length).toBe(count);
  });

  it("TC-02-04 support: the replay meets the SignalSource interface", () => {
    const assertSource = need("assertSource");
    const ReplaySource = need("ReplaySource");
    expect(() => assertSource(new ReplaySource(DRIVE(), { clock: new FakeClock() }))).not.toThrow();
    expect(() => assertSource({})).toThrow();
  });
});
