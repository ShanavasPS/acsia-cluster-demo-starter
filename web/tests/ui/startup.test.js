// F-11: the startup sequence as the cluster shows it. During startup the digits show "0" and
// "0.0", gear, fuel and temperature are blank, and the needles follow the sweep directly
// (no smoothing); see tests/README.md.
describe("Startup on screen", () => {
  let rig;
  afterEach(() => rig && rig.destroy());
  const ON = { low_fuel: "amber", engine_check: "amber", battery: "red", seatbelt: "red", parking_brake: "red" };
  const states = () => TELLTALES.map((n) => rig.telltale(n).getAttribute("data-state"));

  it("TC-11-01 all telltales on in their colours for 1.5 s", () => {
    rig = createRig({ skipStartup: false });
    rig.run(16);
    expect(states()).toEqual(TELLTALES.map((n) => ON[n]));
    rig.run(1384);    // 1400 ms
    expect(states()).toEqual(TELLTALES.map((n) => ON[n]));
    rig.run(220);     // 1620 ms
    expect(states()).toEqual(TELLTALES.map(() => "off"));
  });

  it("TC-11-02 both needles sweep to full scale and back", () => {
    rig = createRig({ skipStartup: false });
    let speedMax = 0, rpmMax = 0;
    rig.run(1700, () => {
      speedMax = Math.max(speedMax, rig.fraction("speed-needle"));
      rpmMax = Math.max(rpmMax, rig.fraction("rpm-needle"));
    });
    expect(speedMax).toBeGreaterThanOrEqual(0.99);
    expect(rpmMax).toBeGreaterThanOrEqual(0.99);
    expect(rig.fraction("speed-needle")).toBeLessThanOrEqual(0.01);   // 1700 ms: back at 0
    expect(rig.fraction("rpm-needle")).toBeLessThanOrEqual(0.01);
  });

  it("TC-11-03 no live value during startup: digits 0, the rest blank", () => {
    rig = createRig({ skipStartup: false, initial: Object.assign({}, PARKED, { vehicle_speed: 64.4, gear: "D" }) });
    const seen = new Set();
    rig.run(1690, () => {
      seen.add([rig.text("speed-text"), rig.text("rpm-text"), rig.text("gear-text"), rig.text("fuel-text"), rig.text("temperature")].join("|"));
      seen.add("D:" + rig.gear("D").getAttribute("data-active"));
    });
    expect(Array.from(seen).sort()).toEqual(["0|0.0|||", "D:false"]);
  });

  it("TC-11-04 live values after the sequence", () => {
    rig = createRig({ skipStartup: false, initial: Object.assign({}, PARKED, { vehicle_speed: 64.4, engine_rpm: 3236, tt_parking_brake: true }) });
    rig.run(1620);
    expect(rig.telltale("parking_brake").getAttribute("data-state")).toBe("off");   // bulb check over, not yet live
    rig.run(480);   // 2100 ms
    expect(rig.text("speed-text")).toBe("40");
    expect(rig.text("rpm-text")).toBe("3.2");
    expect(rig.gear("P").getAttribute("data-active")).toBe("true");
    expect(rig.text("fuel-text")).toBe("24 %");
    expect(rig.text("temperature")).toBe("18.0 °C");
    expect(rig.telltale("parking_brake").getAttribute("data-state")).toBe("red");
  });

  it("TC-11-05 no -- during startup for a signal that starts late", () => {
    const initial = Object.assign({}, PARKED);
    delete initial.vehicle_speed;
    rig = createRig({ skipStartup: false, initial });
    const seen = [];
    const look = () => seen.push(rig.text("speed-text"), rig.text("rpm-text"), rig.text("fuel-text"), rig.text("temperature"));
    rig.run(1000, look);
    rig.source.hold("vehicle_speed", 0);
    rig.run(690, look);
    expect(seen).not.toContain("--");
    rig.run(300);   // live now, and speed arrived in time
    expect(rig.text("speed-text")).toBe("0");
  });

  it("TC-11-06 runs again on a new mount", () => {
    rig = createRig();
    rig.destroy();
    rig = createRig({ skipStartup: false });
    rig.run(16);
    expect(states()).toEqual(TELLTALES.map((n) => ON[n]));
  });
});
