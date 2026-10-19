// F-12: the console override, through the app's debug object (window.clusterDebug on the real page).
describe("Console override", () => {
  let rig;
  afterEach(() => rig && rig.destroy());
  const debug = () => {
    if (!rig.app.debug) throw new Error("Not implemented yet: app.debug");
    return rig.app.debug;
  };
  const lowFuel = () => rig.telltale("low_fuel").getAttribute("data-state");

  it("TC-12-01 fuel set to 8 % lights the low-fuel telltale within 1 s", () => {
    rig = createRig();
    expect(debug().set("fuel_level_pct", 8)).toBe(true);
    rig.run(1000);
    expect(lowFuel()).toBe("amber");
  });

  it("TC-12-02 an override set once beats the replay for as long as it is there", () => {
    rig = createRig();
    rig.source.hold("vehicle_speed", 100);
    debug().set("vehicle_speed", 64.4);
    const seen = [];
    rig.run(5000, () => seen.push(rig.text("speed-text")));   // the source sends 100 km/h all along
    expect(seen.slice(10).every((s) => s === "40")).toBe(true);
  });

  it("TC-12-03 clearing one override restores it and keeps the others", () => {
    rig = createRig();
    debug().set("fuel_level_pct", 8);
    debug().set("vehicle_speed", 50);
    rig.run(200);
    expect(rig.text("fuel-text")).toBe("8 %");
    debug().clear("fuel_level_pct");
    rig.run(200);
    expect(rig.text("fuel-text")).toBe("24 %");
    expect(rig.text("speed-text")).toBe("31");
  });

  it("TC-12-04 clearing all overrides restores everything", () => {
    rig = createRig();
    debug().set("fuel_level_pct", 8);
    debug().set("vehicle_speed", 50);
    rig.run(200);
    debug().clearAll();
    rig.run(200);
    expect(rig.text("fuel-text")).toBe("24 %");
    expect(rig.text("speed-text")).toBe("0");
  });

  it("TC-12-05 an unknown signal is refused with an error", () => {
    rig = createRig();
    const shown = () => ["speed-text", "rpm-text", "fuel-text", "temperature", "gear-text"].map(rig.text)
      .concat(TELLTALES.map((n) => rig.telltale(n).getAttribute("data-state")));
    const before = shown();
    let result;
    const error = captureConsole("error", () => { result = debug().set("turbo_boost", 1); });
    rig.run(100);
    expect(result).toBe(false);
    expect(error.calls).toHaveLength(1);
    expect(String(error.calls[0][0])).toContain("turbo_boost");
    expect(shown()).toEqual(before);
  });

  it("TC-12-06 overrides are range-checked", () => {
    rig = createRig();
    const warn = captureConsole("warn", () => {
      debug().set("vehicle_speed", 300);
      rig.run(100);
    });
    expect(rig.text("speed-text")).toBe("162");
    expect(warn.calls).toHaveLength(1);
  });

  it("TC-12-07 an override holds until cleared; it does not time out", () => {
    rig = createRig();
    debug().set("fuel_level_pct", 8);
    rig.run(1000);
    expect(lowFuel()).toBe("amber");
    rig.run(30000);
    expect(rig.text("fuel-text")).toBe("8 %");
    expect(lowFuel()).toBe("amber");
    debug().clear("fuel_level_pct");
    rig.run(1000);
    expect(rig.text("fuel-text")).toBe("24 %");   // the source's value again
    expect(lowFuel()).toBe("off");
  });

  it("TC-12-01 support: list() names every signal", () => {
    rig = createRig();
    expect(debug().list()).toContain("vehicle_speed");
    expect(debug().list()).toContain("tt_parking_brake");
  });
});
